import { OrderId } from '../../order/vo/order-id'
import { AccountId } from '../../account/vo/account-id'
import { EventType } from '../vo/event-type'

export class DeliveryEventId {
  private readonly _value: string

  constructor(value: string) {
    if (!value) {
      throw new Error('DeliveryEventIdは必須です')
    }
    this._value = value
  }

  get value(): string {
    return this._value
  }

  equals(other: DeliveryEventId): boolean {
    return this._value === other._value
  }
}

export class DeliveryEvent {
  private readonly _id: DeliveryEventId
  private readonly _orderId: OrderId
  private readonly _courierId: AccountId | null
  private readonly _type: EventType
  private readonly _payloadJson: string | null
  private readonly _occurredAt: Date

  constructor(props: {
    id: DeliveryEventId
    orderId: OrderId
    courierId?: AccountId | null
    type: EventType
    payloadJson?: string | null
    occurredAt?: Date
  }) {
    this._id = props.id
    this._orderId = props.orderId
    this._courierId = props.courierId ?? null
    this._type = props.type
    this._payloadJson = props.payloadJson ?? null
    this._occurredAt = props.occurredAt ?? new Date()
  }

  get id(): DeliveryEventId {
    return this._id
  }

  get orderId(): OrderId {
    return this._orderId
  }

  get courierId(): AccountId | null {
    return this._courierId
  }

  get type(): EventType {
    return this._type
  }

  get payloadJson(): string | null {
    return this._payloadJson
  }

  get occurredAt(): Date {
    return this._occurredAt
  }

  getPayload(): any {
    if (!this._payloadJson) {
      return null
    }
    try {
      return JSON.parse(this._payloadJson)
    } catch {
      return null
    }
  }
}
