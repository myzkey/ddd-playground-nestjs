# DDD設計の勘所 - 配送システムサンプル実装

このプロジェクトはDDD（ドメイン駆動設計）の実装サンプルです。実際の業務システムでよくある配送管理をテーマに、DDDの主要な概念を実装しています。

## アーキテクチャ概要

```
src/
├── domain/           # ドメイン層（ビジネスロジック）
├── app/              # アプリケーション層（ユースケース）
├── infra/            # インフラ層（データベース、外部API）
├── controller/       # プレゼンテーション層（REST API）
└── module/           # NestJS モジュール（DI設定）
```

## DDDの重要な設計原則

### 1. 依存性逆転の原則（DIP）

**❌ 悪い例：ドメイン層がインフラ層に依存**

```typescript
// ドメイン層でTypeORMに直接依存（NG）
import { Repository } from 'typeorm'
export class OrderService {
  constructor(private repo: Repository<OrderEntity>) {} // NG
}
```

**✅ 良い例：ドメイン層にインターフェースを定義**

```typescript
// domain/order/order-repository.interface.ts
export interface IOrderRepository {
  findById(id: OrderId): Promise<Order | null>
  save(order: Order): Promise<Order>
}
```

```typescript
// app/order/place-order.usecase.ts
export class PlaceOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository // インターフェースに依存
  ) {}
}
```

**実装の分離：**
- ドメイン層は抽象（インターフェース）のみ知っている
- インフラ層が具象実装を提供
- DIコンテナが実行時に実装を注入

### 2. Repository Pattern - ORMの抽象化

#### ドメインモデルとORMエンティティの分離

**ドメインモデル（純粋なビジネスロジック）**

```typescript
// domain/order/entity/order.ts
export class Order {
  private _status: OrderStatus

  markReadyToShip(): void {
    if (this._status.value !== OrderStatusType.PLACED) {
      throw new Error('PLACED状態の注文のみ出荷準備完了にできます')
    }
    this._status = new OrderStatus(OrderStatusType.READY_TO_SHIP)
  }
}
```

**ORMエンティティ（データベース設計）**

```typescript
// infra/database/entity/order.orm-entity.ts
@Entity('order')
export class OrderOrmEntity {
  @PrimaryColumn('text')
  id: string

  @Column('text', { name: 'status' })
  status: string // データベースの型
}
```

#### Repository実装でのマッピング

```typescript
// infra/database/repository/order.repository.ts
@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(
    @InjectRepository(OrderOrmEntity)
    private readonly orderRepository: Repository<OrderOrmEntity>,
  ) {}

  async save(order: Order): Promise<Order> {
    const entity = this.toEntity(order)      // ドメイン → ORM
    const savedEntity = await this.orderRepository.save(entity)
    return this.toDomain(savedEntity)        // ORM → ドメイン
  }

  // ドメインモデル ↔ ORMエンティティの変換
  private toDomain(entity: OrderOrmEntity): Order {
    return new Order({
      id: new OrderId(entity.id),
      status: new OrderStatus(entity.status), // 値オブジェクトで包む
      // ...
    })
  }

  private toEntity(domain: Order): OrderOrmEntity {
    const entity = new OrderOrmEntity()
    entity.id = domain.id.value              // 値オブジェクトから値を取り出す
    entity.status = domain.status.value
    return entity
  }
}
```

**ポイント：**
- ORMエンティティはインフラ層の関心事
- ドメインモデルはビジネスルールの関心事
- Repositoryが変換を担当し、ドメイン層がORMを知らない状態を保つ

### 3. 集約の設計

#### 集約境界の明確化

```typescript
// Order集約
export class Order {
  // 集約ルート
  assign(): void {
    if (!this._status.canBeAssigned()) {
      throw new Error('READY_TO_SHIP状態の注文のみ割り当て可能です')
    }
    this._status = new OrderStatus(OrderStatusType.ASSIGNED)
  }
}

// Assignment集約（別の集約）
export class Assignment {
  accept(): void {
    if (!this._status.isPending()) {
      throw new Error('PENDING状態の割り当てのみ受諾可能です')
    }
    this._status = new AssignmentStatus(AssignmentStatusType.ACCEPTED)
  }
}
```

#### 集約間の整合性はアプリケーション層で管理

```typescript
// app/assignment/accept-assignment.usecase.ts
export class AcceptAssignmentUseCase {
  async execute(assignmentId: string): Promise<Assignment> {
    // 1. Assignment集約を操作
    const assignment = await this.assignmentRepository.findById(new AssignmentId(assignmentId))
    assignment.accept()
    const updatedAssignment = await this.assignmentRepository.update(assignment)

    // 2. Order集約を操作（別の集約なので別途取得・更新）
    const order = await this.orderRepository.findById(assignment.orderId)
    order.assign()
    await this.orderRepository.update(order)

    // 3. ドメインイベント発行
    const event = new DeliveryEvent({...})
    await this.deliveryEventRepository.save(event)

    return updatedAssignment
  }
}
```

### 4. 値オブジェクト（Value Object）

#### 不変性とバリデーション

```typescript
// domain/order/vo/address.ts
export class Address {
  private readonly _value: string

  constructor(value: string) {
    if (!value || value.trim() === '') {
      throw new Error('住所は必須です')  // ドメインレベルでのバリデーション
    }
    this._value = value.trim()
  }

  get value(): string {
    return this._value
  }

  equals(other: Address): boolean {  // 値による等価性
    return this._value === other._value
  }
}
```

**活用方法：**
- プリミティブ型をラップして意味を明確化
- バリデーションロジックをカプセル化
- 不変性によりバグを防止

### 5. ドメインイベント

#### イベント駆動設計

```typescript
// domain/delivery-event/entity/delivery-event.ts
export class DeliveryEvent {
  constructor(props: {
    orderId: OrderId
    type: EventType
    payloadJson?: string
    occurredAt?: Date
  }) {
    // イベントの永続化
  }
}
```

```typescript
// Use Caseでのイベント発行
export class PlaceOrderUseCase {
  async execute(params: PlaceOrderParams): Promise<Order> {
    // 1. ビジネスロジック実行
    const order = new Order({...})
    const savedOrder = await this.orderRepository.save(order)

    // 2. ドメインイベント発行
    const event = new DeliveryEvent({
      orderId: order.id,
      type: new EventType(EventTypeValue.ORDER_PLACED),
      payloadJson: JSON.stringify({...})
    })
    await this.deliveryEventRepository.save(event)

    return savedOrder
  }
}
```

### 6. 依存性注入（DI）の設計

#### モジュール設計

```typescript
// module/order.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([OrderOrmEntity]),  // ORMエンティティ登録
    DeliveryEventModule                          // 他モジュールの依存
  ],
  providers: [
    OrderRepository,                             // 具象クラス
    {
      provide: PlaceOrderUseCase,
      useFactory: (
        orderRepository: OrderRepository,
        deliveryEventRepository: DeliveryEventRepository,
      ) => {
        return new PlaceOrderUseCase(orderRepository, deliveryEventRepository)
      },
      inject: [OrderRepository, DeliveryEventRepository],
    },
  ],
  exports: [OrderRepository],                    // 他モジュールで使用可能に
})
export class OrderModule {}
```

**DI設計の勘所：**
- インターフェースを依存として宣言
- 具象クラスをDIコンテナに登録
- テスト時はモックを注入可能

### 7. レイヤー間の依存関係

```
┌─────────────────┐
│ Presentation    │ ← Controller, DTO
└─────────────────┘
         │ 依存
┌─────────────────┐
│ Application     │ ← UseCase, ApplicationService
└─────────────────┘
         │ 依存
┌─────────────────┐
│ Domain          │ ← Entity, ValueObject, Repository Interface
└─────────────────┘
         ↑ 依存性逆転
┌─────────────────┐
│ Infrastructure  │ ← Repository Implementation, ORM Entity
└─────────────────┘
```

**重要な原則：**
- 上位レイヤーは下位レイヤーに依存してOK
- 下位レイヤーは上位レイヤーに依存してはいけない
- インフラ層は例外：ドメイン層のインターフェースに依存（依存性逆転）

## 実装時のチェックポイント

### ✅ ドメイン層の純粋性
- ドメインモデルがORM、Framework固有の注釈を持たない
- ビジネスルールがドメインモデルに集約されている
- 外部システムへの依存がインターフェース経由

### ✅ Repository パターン
- ドメイン層にRepositoryインターフェースが定義されている
- インフラ層でORMを使った実装を提供
- ドメインモデル ↔ ORMエンティティの変換が適切

### ✅ 集約設計
- 集約境界が適切に設計されている
- 集約間の整合性がアプリケーション層で管理されている
- トランザクション境界が集約と一致している

### ✅ 依存性注入
- 具象クラスではなくインターフェースに依存
- DIコンテナで実装を注入
- テスト時にモックが注入可能

## まとめ

このサンプル実装では以下のDDDの核心的な概念を実装しています：

1. **依存性逆転**: ドメイン層がインフラ層を知らない
2. **Repository抽象化**: ORMの詳細をドメイン層から隠蔽
3. **集約設計**: ビジネス不変条件を保護
4. **値オブジェクト**: プリミティブ型の意味付けと保護
5. **ドメインイベント**: 状態変更の追跡と疎結合な連携
6. **レイヤー分離**: 関心事の分離と保守性の向上

これらの設計により、ビジネスロジックが保護され、変更に強く、テストしやすいシステムを構築できます。
