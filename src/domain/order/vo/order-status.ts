export enum OrderStatusType {
  PLACED = 'PLACED',
  READY_TO_SHIP = 'READY_TO_SHIP',
  ASSIGNED = 'ASSIGNED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class OrderStatus {
  private readonly _value: OrderStatusType

  constructor(value: string) {
    if (!Object.values(OrderStatusType).includes(value as OrderStatusType)) {
      throw new Error(`無効な注文ステータスです: ${value}`)
    }
    this._value = value as OrderStatusType
  }

  get value(): OrderStatusType {
    return this._value
  }

  canBeAssigned(): boolean {
    return this._value === OrderStatusType.READY_TO_SHIP
  }

  isDelivered(): boolean {
    return this._value === OrderStatusType.DELIVERED
  }

  isCancelled(): boolean {
    return this._value === OrderStatusType.CANCELLED
  }

  equals(other: OrderStatus): boolean {
    return this._value === other._value
  }
}
