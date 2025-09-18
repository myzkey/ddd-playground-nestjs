export enum EventTypeValue {
  ORDER_PLACED = 'ORDER_PLACED',
  READY_TO_SHIP = 'READY_TO_SHIP',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class EventType {
  private readonly _value: EventTypeValue

  constructor(value: string) {
    if (!Object.values(EventTypeValue).includes(value as EventTypeValue)) {
      throw new Error(`無効なイベントタイプです: ${value}`)
    }
    this._value = value as EventTypeValue
  }

  get value(): EventTypeValue {
    return this._value
  }

  equals(other: EventType): boolean {
    return this._value === other._value
  }
}
