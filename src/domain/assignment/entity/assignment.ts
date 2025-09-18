import { AssignmentId } from '../vo/assignment-id'
import { AssignmentStatus, AssignmentStatusType } from '../vo/assignment-status'
import { OrderId } from '../../order/vo/order-id'
import { AccountId } from '../../account/vo/account-id'

export class Assignment {
  private readonly _id: AssignmentId
  private readonly _orderId: OrderId
  private readonly _courierId: AccountId
  private _status: AssignmentStatus
  private readonly _offeredAt: Date
  private _respondedAt: Date | null

  constructor(props: {
    id: AssignmentId
    orderId: OrderId
    courierId: AccountId
    status: AssignmentStatus
    offeredAt?: Date
    respondedAt?: Date | null
  }) {
    this._id = props.id
    this._orderId = props.orderId
    this._courierId = props.courierId
    this._status = props.status
    this._offeredAt = props.offeredAt ?? new Date()
    this._respondedAt = props.respondedAt ?? null
  }

  get id(): AssignmentId {
    return this._id
  }

  get orderId(): OrderId {
    return this._orderId
  }

  get courierId(): AccountId {
    return this._courierId
  }

  get status(): AssignmentStatus {
    return this._status
  }

  get offeredAt(): Date {
    return this._offeredAt
  }

  get respondedAt(): Date | null {
    return this._respondedAt
  }

  // ドメインロジック
  accept(): void {
    if (!this._status.isPending()) {
      throw new Error('PENDING状態の割り当てのみ受諾可能です')
    }
    this._status = new AssignmentStatus(AssignmentStatusType.ACCEPTED)
    this._respondedAt = new Date()
  }

  reject(): void {
    if (!this._status.isPending()) {
      throw new Error('PENDING状態の割り当てのみ拒否可能です')
    }
    this._status = new AssignmentStatus(AssignmentStatusType.REJECTED)
    this._respondedAt = new Date()
  }

  complete(): void {
    if (!this._status.isAccepted()) {
      throw new Error('ACCEPTED状態の割り当てのみ完了可能です')
    }
    this._status = new AssignmentStatus(AssignmentStatusType.COMPLETED)
  }

  cancel(): void {
    if (this._status.isCompleted()) {
      throw new Error('完了した割り当てはキャンセルできません')
    }
    this._status = new AssignmentStatus(AssignmentStatusType.CANCELLED)
  }

  isActive(): boolean {
    return this._status.isActive()
  }
}
