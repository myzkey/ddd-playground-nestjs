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

#### 集約間の整合性管理の選択肢

集約間の整合性管理は複数のアプローチがあります：

**🎯 アプローチ1: アプリケーション層で直接管理**

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

**🎯 アプローチ2: ドメインサービスで複雑なビジネスロジックを管理**

```typescript
// domain/assignment/service/assignment-coordination.service.ts
export class AssignmentCoordinationService {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly assignmentRepository: IAssignmentRepository,
    private readonly deliveryEventRepository: IDeliveryEventRepository
  ) {}

  async acceptAssignmentWithOrderUpdate(
    assignment: Assignment
  ): Promise<{ assignment: Assignment; order: Order }> {
    // 複雑なビジネスルールをドメインサービスでカプセル化
    if (!assignment.canBeAccepted()) {
      throw new Error('この割り当ては受諾できません')
    }

    const order = await this.orderRepository.findById(assignment.orderId)
    if (!order.canBeAssigned()) {
      throw new Error('この注文は割り当て不可能な状態です')
    }

    // 集約間の調整ロジック
    assignment.accept()
    order.assign()

    // ドメインイベント発行
    const event = new DeliveryEvent({
      orderId: order.id,
      type: new EventType(EventTypeValue.ASSIGNMENT_ACCEPTED),
      payloadJson: JSON.stringify({ assignmentId: assignment.id.value })
    })
    await this.deliveryEventRepository.save(event)

    return { assignment, order }
  }
}
```

```typescript
// app/assignment/accept-assignment.usecase.ts（ドメインサービス利用版）
export class AcceptAssignmentUseCase {
  constructor(
    private readonly assignmentRepository: IAssignmentRepository,
    private readonly orderRepository: IOrderRepository,
    private readonly assignmentCoordinationService: AssignmentCoordinationService
  ) {}

  async execute(assignmentId: string): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findById(new AssignmentId(assignmentId))

    // ドメインサービスに複雑な調整ロジックを委譲
    const { assignment: updatedAssignment, order } =
      await this.assignmentCoordinationService.acceptAssignmentWithOrderUpdate(assignment)

    // 永続化
    await this.assignmentRepository.update(updatedAssignment)
    await this.orderRepository.update(order)

    return updatedAssignment
  }
}
```

**🎯 アプローチ3: イベント駆動による非同期整合性**

```typescript
// app/assignment/accept-assignment.usecase.ts（イベント駆動版）
export class AcceptAssignmentUseCase {
  async execute(assignmentId: string): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findById(new AssignmentId(assignmentId))
    assignment.accept()
    const updatedAssignment = await this.assignmentRepository.update(assignment)

    // イベント発行のみ（非同期で他の集約を更新）
    const event = new DeliveryEvent({
      orderId: assignment.orderId,
      type: new EventType(EventTypeValue.ASSIGNMENT_ACCEPTED),
      payloadJson: JSON.stringify({ assignmentId: assignmentId })
    })
    await this.deliveryEventRepository.save(event)

    return updatedAssignment
  }
}

// 別のイベントハンドラーでOrder集約を更新
// app/order/event-handler/assignment-accepted.handler.ts
export class AssignmentAcceptedEventHandler {
  async handle(event: DeliveryEvent): Promise<void> {
    if (event.type.value === EventTypeValue.ASSIGNMENT_ACCEPTED) {
      const order = await this.orderRepository.findById(event.orderId)
      order.assign()
      await this.orderRepository.update(order)
    }
  }
}
```

#### 選択指針

| アプローチ | 適用場面 | メリット | デメリット |
|---------|---------|---------|----------|
| **アプリケーション層直接管理** | シンプルな集約間連携 | 実装が分かりやすい | UseCaseが複雑になりがち |
| **ドメインサービス** | 複雑なビジネスルール | ドメインロジックの適切な場所 | 過度に使うとドメインサービスが肥大化 |
| **イベント駆動** | 疎結合が重要な場合 | 高い拡張性と非同期処理 | 複雑性とデバッグ困難 |

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

### 4.5. エンティティの不変性（設計判断）

エンティティを不変（イミュータブル）にするかどうかは設計チームで議論すべき内容

#### 🔄 ミュータブルなエンティティ（従来アプローチ）

```typescript
// domain/order/entity/order.ts
export class Order {
  private _id: OrderId
  private _status: OrderStatus
  private _customerId: CustomerId
  private _address: Address

  constructor(props: OrderProps) {
    this._id = props.id
    this._status = props.status
    this._customerId = props.customerId
    this._address = props.address
  }

  // 状態を直接変更
  markReadyToShip(): void {
    if (this._status.value !== OrderStatusType.PLACED) {
      throw new Error('PLACED状態の注文のみ出荷準備完了にできます')
    }
    this._status = new OrderStatus(OrderStatusType.READY_TO_SHIP)  // 直接変更
  }

  // ゲッター
  get id(): OrderId { return this._id }
  get status(): OrderStatus { return this._status }
  get customerId(): CustomerId { return this._customerId }
  get address(): Address { return this._address }
}
```

#### 🛡️ イミュータブルなエンティティ（関数型アプローチ）

```typescript
// domain/order/entity/order.ts
export class Order {
  private readonly _id: OrderId
  private readonly _status: OrderStatus
  private readonly _customerId: CustomerId
  private readonly _address: Address

  constructor(props: OrderProps) {
    this._id = props.id
    this._status = props.status
    this._customerId = props.customerId
    this._address = props.address
  }

  // 新しいインスタンスを返す
  markReadyToShip(): Order {
    if (this._status.value !== OrderStatusType.PLACED) {
      throw new Error('PLACED状態の注文のみ出荷準備完了にできます')
    }

    return new Order({
      id: this._id,
      status: new OrderStatus(OrderStatusType.READY_TO_SHIP),  // 新しいインスタンス
      customerId: this._customerId,
      address: this._address
    })
  }

  // ゲッター
  get id(): OrderId { return this._id }
  get status(): OrderStatus { return this._status }
  get customerId(): CustomerId { return this._customerId }
  get address(): Address { return this._address }
}
```

```typescript
// 使用方法の違い
// ミュータブル版
const order = new Order({...})
order.markReadyToShip()  // order自身が変更される
await repository.save(order)

// イミュータブル版
const order = new Order({...})
const updatedOrder = order.markReadyToShip()  // 新しいインスタンスが返される
await repository.save(updatedOrder)
```

#### 比較：メリット・デメリット

| 観点 | ミュータブル | イミュータブル |
|------|-------------|---------------|
| **パフォーマンス** | ✅ オブジェクト作成コストが低い | ❌ 毎回新しいインスタンス作成 |
| **メモリ使用量** | ✅ 少ない | ❌ 多い（古いインスタンスもGCまで残る） |
| **並行処理安全性** | ❌ 共有状態の競合リスク | ✅ 完全にスレッドセーフ |
| **デバッグしやすさ** | ❌ 状態変更の追跡が困難 | ✅ 状態変更が明示的 |
| **テストしやすさ** | ❌ 副作用のあるメソッドテスト | ✅ 純粋関数的テスト |
| **ORM連携** | ✅ ActiveRecordパターンとマッチ | ❌ Repository実装が複雑化 |
| **複雑な状態変更** | ✅ 直感的 | ❌ Builder等のパターンが必要 |
| **実装の自然さ** | ✅ 一般的なOOP | ❌ 関数型プログラミング的 |

#### 実践的な判断指針

**ミュータブルを選ぶべき場合：**
- パフォーマンスが重要なシステム
- チームがOOPに慣れている
- 複雑な状態遷移が多い
- ActiveRecordパターンを使いたい

**イミュータブルを選ぶべき場合：**
- 並行処理が多いシステム
- 関数型プログラミングに慣れている
- 状態変更の追跡可能性が重要
- 副作用のないテストを重視

**💡 推奨：ハイブリッドアプローチ**

プロジェクトの性質に応じて使い分け：

```typescript
// シンプルなエンティティ：ミュータブル
export class Customer {
  updateEmail(email: Email): void {
    this._email = email
  }
}

// 複雑なビジネスルールのエンティティ：イミュータブル
export class Order {
  processPayment(amount: Money): Order {
    return new Order({...this, status: OrderStatus.PAID})
  }
}
```

**重要：チーム内で一貫性を保つことが最も重要。**

### 4.6. 副作用（Side Effects）の管理

DDDにおいて副作用の適切な管理は、ドメインロジックの純粋性を保つために重要です。

#### ❌ 悪い例：ドメインモデルに副作用が混入

```typescript
// ドメイン層で副作用を持つ（NG）
export class Order {
  markReadyToShip(): void {
    if (this._status.value !== OrderStatusType.PLACED) {
      throw new Error('PLACED状態の注文のみ出荷準備完了にできます')
    }

    this._status = new OrderStatus(OrderStatusType.READY_TO_SHIP)

    // ❌ ドメインモデル内でDB操作（副作用）
    database.save(this)

    // ❌ ドメインモデル内で外部API呼び出し（副作用）
    emailService.sendNotification(this._customerId, 'Order is ready to ship')

    // ❌ ドメインモデル内でログ出力（副作用）
    logger.info(`Order ${this._id} is ready to ship`)
  }
}
```

#### ✅ 良い例：副作用を適切に分離

```typescript
// ドメインモデル：純粋なビジネスロジックのみ
export class Order {
  markReadyToShip(): void {
    if (this._status.value !== OrderStatusType.PLACED) {
      throw new Error('PLACED状態の注文のみ出荷準備完了にできます')
    }
    this._status = new OrderStatus(OrderStatusType.READY_TO_SHIP)
    // 副作用なし、状態変更のみ
  }
}

// アプリケーション層：副作用を適切に管理
export class MarkOrderReadyToShipUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly notificationService: INotificationService,
    private readonly logger: ILogger
  ) {}

  async execute(orderId: OrderId): Promise<Order> {
    // 1. ドメインロジック実行（副作用なし）
    const order = await this.orderRepository.findById(orderId)
    order.markReadyToShip()

    // 2. 副作用を明示的に実行
    const updatedOrder = await this.orderRepository.save(order)  // DB操作

    // 3. 外部システムとの連携
    await this.notificationService.sendReadyToShipNotification(
      order.customerId,
      order.id
    )

    // 4. ログ出力
    this.logger.info(`Order ${order.id.value} marked as ready to ship`)

    return updatedOrder
  }
}
```

#### 副作用の種類と管理方針

| 副作用の種類 | 例 | 管理場所 | 注意点 |
|-------------|---|---------|--------|
| **データ永続化** | DB保存、ファイル書き込み | アプリケーション層 | Repository経由で抽象化 |
| **外部API呼び出し** | メール送信、決済処理 | アプリケーション層 | インターフェース経由で依存性注入 |
| **ログ出力** | アプリケーションログ | アプリケーション層 | 構造化ログを推奨 |
| **イベント発行** | ドメインイベント | アプリケーション層 | イベントソーシング考慮 |
| **時刻取得** | 現在時刻の参照 | 値オブジェクトまたはサービス | テスト可能性のため注入 |
| **ランダム値生成** | UUID生成 | 値オブジェクトまたはサービス | 決定的テストのため注入 |

#### ドメインサービスでの副作用管理

```typescript
// ドメインサービス：複雑なビジネスルールだが副作用は最小限
export class OrderValidationService {
  constructor(
    private readonly orderRepository: IOrderRepository  // 読み取り専用
  ) {}

  async canBeShipped(order: Order): Promise<boolean> {
    // 読み取り専用の副作用は許容される場合がある
    const relatedOrders = await this.orderRepository.findByCustomerId(order.customerId)

    // ビジネスルール判定（副作用なし）
    return relatedOrders.every(o => o.status.canCoexistWithShipping())
  }
}
```

#### 時刻やID生成の副作用対策

```typescript
// ❌ 副作用のあるドメインモデル
export class Order {
  static create(customerId: CustomerId, address: Address): Order {
    return new Order({
      id: new OrderId(crypto.randomUUID()),  // ❌ 非決定的
      customerId,
      address,
      createdAt: new Date(),  // ❌ 非決定的
      status: new OrderStatus(OrderStatusType.PLACED)
    })
  }
}

// ✅ 副作用を外部から注入
export class Order {
  static create(
    id: OrderId,  // 外部から注入
    customerId: CustomerId,
    address: Address,
    createdAt: Date  // 外部から注入
  ): Order {
    return new Order({
      id,
      customerId,
      address,
      createdAt,
      status: new OrderStatus(OrderStatusType.PLACED)
    })
  }
}

// アプリケーション層で副作用を管理
export class PlaceOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly timeProvider: ITimeProvider
  ) {}

  async execute(params: PlaceOrderParams): Promise<Order> {
    const order = Order.create(
      this.idGenerator.generateOrderId(),  // 副作用を注入
      params.customerId,
      params.address,
      this.timeProvider.now()  // 副作用を注入
    )

    return await this.orderRepository.save(order)
  }
}
```

#### テストにおける副作用の扱い

```typescript
// ドメインモデルのテスト：副作用がないため簡単
describe('Order', () => {
  it('should mark as ready to ship when status is PLACED', () => {
    const order = new Order({
      id: new OrderId('test-id'),
      status: new OrderStatus(OrderStatusType.PLACED),
      // ...
    })

    order.markReadyToShip()  // 副作用なし、テストしやすい

    expect(order.status.value).toBe(OrderStatusType.READY_TO_SHIP)
  })
})

// UseCase のテスト：副作用をモック化
describe('MarkOrderReadyToShipUseCase', () => {
  it('should mark order and send notification', async () => {
    const mockRepository = { save: jest.fn(), findById: jest.fn() }
    const mockNotificationService = { sendReadyToShipNotification: jest.fn() }
    const useCase = new MarkOrderReadyToShipUseCase(mockRepository, mockNotificationService)

    await useCase.execute(new OrderId('test-id'))

    expect(mockRepository.save).toHaveBeenCalled()
    expect(mockNotificationService.sendReadyToShipNotification).toHaveBeenCalled()
  })
})
```

#### 副作用管理の原則

1. **ドメイン層は副作用フリー**: ビジネスロジックに集中
2. **アプリケーション層で副作用を統制**: UseCase が責任を持つ
3. **依存性注入で副作用を抽象化**: テスト可能性を確保
4. **読み取り専用の副作用は慎重に判断**: ドメインサービスで限定的に許容
5. **副作用の境界を明確化**: どこで何の副作用が発生するかを明示

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
