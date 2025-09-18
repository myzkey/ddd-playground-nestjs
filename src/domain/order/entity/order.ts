import { OrderId } from '../vo/order-id'
import { OrderStatus, OrderStatusType } from '../vo/order-status'
import { Address } from '../vo/address'
import { TimeWindow } from '../vo/time-window'
import { Weight } from '../vo/weight'
import { AccountId } from '../../account/vo/account-id'

export class Order {
  private readonly _id: OrderId
  private readonly _shipperId: AccountId
  private _status: OrderStatus
  private readonly _pickupAddress: Address
  private readonly _dropoffAddress: Address
  private readonly _pickupTimeWindow: TimeWindow
  private readonly _dropoffTimeWindow: TimeWindow
  private readonly _totalWeight: Weight
  private readonly _notes: string | null
  private readonly _createdAt: Date

  constructor(props: {
    id: OrderId
    shipperId: AccountId
    status: OrderStatus
    pickupAddress: Address
    dropoffAddress: Address
    pickupTimeWindow: TimeWindow
    dropoffTimeWindow: TimeWindow
    totalWeight: Weight
    notes?: string | null
    createdAt?: Date
  }) {
    this._id = props.id
    this._shipperId = props.shipperId
    this._status = props.status
    this._pickupAddress = props.pickupAddress
    this._dropoffAddress = props.dropoffAddress
    this._pickupTimeWindow = props.pickupTimeWindow
    this._dropoffTimeWindow = props.dropoffTimeWindow
    this._totalWeight = props.totalWeight
    this._notes = props.notes ?? null
    this._createdAt = props.createdAt ?? new Date()
  }

  get id(): OrderId {
    return this._id
  }

  get shipperId(): AccountId {
    return this._shipperId
  }

  get status(): OrderStatus {
    return this._status
  }

  get pickupAddress(): Address {
    return this._pickupAddress
  }

  get dropoffAddress(): Address {
    return this._dropoffAddress
  }

  get pickupTimeWindow(): TimeWindow {
    return this._pickupTimeWindow
  }

  get dropoffTimeWindow(): TimeWindow {
    return this._dropoffTimeWindow
  }

  get totalWeight(): Weight {
    return this._totalWeight
  }

  get notes(): string | null {
    return this._notes
  }

  get createdAt(): Date {
    return this._createdAt
  }

  // ドメインロジック
  markReadyToShip(): void {
    if (this._status.value !== OrderStatusType.PLACED) {
      throw new Error('PLACED状態の注文のみ出荷準備完了にできます')
    }
    this._status = new OrderStatus(OrderStatusType.READY_TO_SHIP)
  }

  assign(): void {
    if (!this._status.canBeAssigned()) {
      throw new Error('READY_TO_SHIP状態の注文のみ割り当て可能です')
    }
    this._status = new OrderStatus(OrderStatusType.ASSIGNED)
  }

  deliver(): void {
    if (this._status.value !== OrderStatusType.ASSIGNED) {
      throw new Error('ASSIGNED状態の注文のみ配達完了にできます')
    }
    this._status = new OrderStatus(OrderStatusType.DELIVERED)
  }

  cancel(): void {
    if (this._status.isDelivered()) {
      throw new Error('配達済みの注文はキャンセルできません')
    }
    this._status = new OrderStatus(OrderStatusType.CANCELLED)
  }

  canBeAssigned(): boolean {
    return this._status.canBeAssigned()
  }
}
