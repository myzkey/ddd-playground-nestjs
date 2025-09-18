# DDD設計の勘所 - 配送システムサンプル実装

このプロジェクトはDDD（ドメイン駆動設計）の実装サンプルです。実際の業務システムでよくある配送管理をテーマに、DDDの主要な概念を実装しています。

## アーキテクチャ概要

```text
src/
├── domain/           # ドメイン層（ビジネスロジック）
├── app/              # アプリケーション層（ユースケース）
├── infra/            # インフラ層（データベース、外部API）
├── controller/       # プレゼンテーション層（REST API）
└── module/           # NestJS モジュール（DI設定）
```

## DDDの重要な設計原則

### 1. 依存性逆転の原則（DIP）

#### ❌ 悪い例：ドメイン層がインフラ層に依存

```typescript
// ドメイン層でTypeORMに直接依存（NG）
import { Repository } from 'typeorm'
export class OrderService {
  constructor(private repo: Repository<OrderEntity>) {} // NG
}
```

#### ✅ 良い例：ドメイン層にインターフェースを定義

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

## テスタビリティ - DDDによるテストコードの書きやすさ

### 8. 単体テストの設計

#### RepositoryのDIによる単体テストの改善

**❌ テストしにくい例：直接的なDB依存**

```typescript
// 悪い例：UseCase内でDBに直接依存
export class PlaceOrderUseCase {
  async execute(params: PlaceOrderParams): Promise<Order> {
    // TypeORMを直接使用（テスト困難）
    const orderEntity = new OrderOrmEntity()
    orderEntity.id = params.orderId
    await this.dataSource.getRepository(OrderOrmEntity).save(orderEntity)
    // ...
  }
}
```

**✅ テストしやすい例：Repository DIによる分離**

```typescript
// 良い例：UseCase（実装）
export class PlaceOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,  // インターフェースに依存
    private readonly deliveryEventRepository: IDeliveryEventRepository
  ) {}

  async execute(params: PlaceOrderParams): Promise<Order> {
    const order = new Order(params)
    const savedOrder = await this.orderRepository.save(order)

    const event = new DeliveryEvent({...})
    await this.deliveryEventRepository.save(event)

    return savedOrder
  }
}
```

```typescript
// テストコード
describe('PlaceOrderUseCase', () => {
  let useCase: PlaceOrderUseCase
  let mockOrderRepository: jest.Mocked<IOrderRepository>
  let mockEventRepository: jest.Mocked<IDeliveryEventRepository>

  beforeEach(() => {
    // モックを簡単に注入可能
    mockOrderRepository = {
      save: jest.fn(),
      findById: jest.fn(),
    }
    mockEventRepository = {
      save: jest.fn(),
    }

    useCase = new PlaceOrderUseCase(mockOrderRepository, mockEventRepository)
  })

  it('should place order and publish event', async () => {
    // Given
    const params = new PlaceOrderParams({...})
    const expectedOrder = new Order(params)
    mockOrderRepository.save.mockResolvedValue(expectedOrder)

    // When
    const result = await useCase.execute(params)

    // Then
    expect(mockOrderRepository.save).toHaveBeenCalledWith(expect.any(Order))
    expect(mockEventRepository.save).toHaveBeenCalledWith(expect.any(DeliveryEvent))
    expect(result).toEqual(expectedOrder)
  })
})
```

#### ドメインモデルの単体テスト

```typescript
// domain/order/entity/order.spec.ts
describe('Order', () => {
  describe('markReadyToShip', () => {
    it('should mark order as ready to ship when status is PLACED', () => {
      // Given
      const order = new Order({
        id: new OrderId('order-123'),
        status: new OrderStatus(OrderStatusType.PLACED),
        customerId: new CustomerId('customer-456'),
        address: new Address('東京都渋谷区')
      })

      // When
      order.markReadyToShip()

      // Then
      expect(order.status.value).toBe(OrderStatusType.READY_TO_SHIP)
    })

    it('should throw error when status is not PLACED', () => {
      // Given
      const order = new Order({
        id: new OrderId('order-123'),
        status: new OrderStatus(OrderStatusType.SHIPPED),  // 既に出荷済み
        customerId: new CustomerId('customer-456'),
        address: new Address('東京都渋谷区')
      })

      // When & Then
      expect(() => order.markReadyToShip()).toThrow('PLACED状態の注文のみ出荷準備完了にできます')
    })
  })
})
```

#### 値オブジェクトの単体テスト

```typescript
// domain/order/vo/address.spec.ts
describe('Address', () => {
  it('should create valid address', () => {
    // Given & When
    const address = new Address('東京都渋谷区')

    // Then
    expect(address.value).toBe('東京都渋谷区')
  })

  it('should throw error for empty address', () => {
    // Given & When & Then
    expect(() => new Address('')).toThrow('住所は必須です')
    expect(() => new Address('   ')).toThrow('住所は必須です')
  })

  it('should trim whitespace', () => {
    // Given & When
    const address = new Address('  東京都渋谷区  ')

    // Then
    expect(address.value).toBe('東京都渋谷区')
  })

  it('should compare by value', () => {
    // Given
    const address1 = new Address('東京都渋谷区')
    const address2 = new Address('東京都渋谷区')
    const address3 = new Address('大阪府大阪市')

    // When & Then
    expect(address1.equals(address2)).toBe(true)
    expect(address1.equals(address3)).toBe(false)
  })
})
```

### 9. 統合テストの設計

#### Repository実装のテスト

```typescript
// infra/database/repository/order.repository.spec.ts
describe('OrderRepository', () => {
  let repository: OrderRepository
  let testingModule: TestingModule

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',  // インメモリDB使用
          entities: [OrderOrmEntity],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([OrderOrmEntity]),
      ],
      providers: [OrderRepository],
    }).compile()

    repository = testingModule.get<OrderRepository>(OrderRepository)
  })

  it('should save and find order', async () => {
    // Given
    const order = new Order({
      id: new OrderId('order-123'),
      status: new OrderStatus(OrderStatusType.PLACED),
      customerId: new CustomerId('customer-456'),
      address: new Address('東京都渋谷区')
    })

    // When
    await repository.save(order)
    const foundOrder = await repository.findById(new OrderId('order-123'))

    // Then
    expect(foundOrder).toBeDefined()
    expect(foundOrder.id.value).toBe('order-123')
    expect(foundOrder.status.value).toBe(OrderStatusType.PLACED)
  })
})
```

#### E2Eテストでの統合確認

```typescript
// test/order.e2e-spec.ts
describe('Order API (e2e)', () => {
  let app: INestApplication

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('/orders (POST)', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .send({
        customerId: 'customer-456',
        address: '東京都渋谷区'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined()
        expect(res.body.status).toBe('PLACED')
      })
  })
})
```

### テスト戦略の利点

#### 🎯 レイヤー別テスト戦略

1. **ドメイン層テスト（単体テスト）**
   - 外部依存なし、高速実行
   - ビジネスルールの完全な検証
   - モックやスタブ不要

2. **アプリケーション層テスト（単体テスト）**
   - Repository をモック化
   - ユースケースロジックの検証
   - 外部サービス呼び出しの検証

3. **インフラ層テスト（統合テスト）**
   - 実際のDBとの接続確認
   - ORMマッピングの検証
   - データ変換ロジックの確認

4. **プレゼンテーション層テスト（E2E）**
   - API全体の動作確認
   - 実際のHTTPリクエスト/レスポンス検証

#### 🚀 DDDによるテストの改善点

- **高速な単体テスト**: ドメインロジックがDB等に依存しないため高速
- **モック化の容易さ**: インターフェース駆動設計によりモック注入が簡単
- **テストの独立性**: 各レイヤーが疎結合のため、個別にテスト可能
- **ビジネスロジックの保護**: ドメインモデルのテストでビジネスルール違反を防止
- **リファクタリング安全性**: 外部技術変更時もドメインテストは影響を受けない

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

### ✅ テスタビリティ

- ドメインロジックが外部依存なしでテスト可能
- Repositoryがモック化でき、UseCase単体テストが高速
- レイヤー別にテスト戦略が明確
- ビジネスルールが完全にテストされている

## まとめ

このサンプル実装では以下のDDDの核心的な概念を実装しています：

1. **依存性逆転**: ドメイン層がインフラ層を知らない
2. **Repository抽象化**: ORMの詳細をドメイン層から隠蔽
3. **集約設計**: ビジネス不変条件を保護
4. **値オブジェクト**: プリミティブ型の意味付けと保護
5. **ドメインイベント**: 状態変更の追跡と疎結合な連携
6. **レイヤー分離**: 関心事の分離と保守性の向上

これらの設計により、ビジネスロジックが保護され、変更に強く、テストしやすいシステムを構築できます。

## Installation

```bash
pnpm install
```

## Running the app

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Test

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```
