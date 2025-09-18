export enum AccountRoleType {
  SHIPPER = 'SHIPPER',
  COURIER = 'COURIER',
}

export class AccountRole {
  private readonly _value: AccountRoleType

  constructor(value: string) {
    if (!Object.values(AccountRoleType).includes(value as AccountRoleType)) {
      throw new Error(`無効な役割です: ${value}`)
    }
    this._value = value as AccountRoleType
  }

  get value(): AccountRoleType {
    return this._value
  }

  isShipper(): boolean {
    return this._value === AccountRoleType.SHIPPER
  }

  isCourier(): boolean {
    return this._value === AccountRoleType.COURIER
  }

  equals(other: AccountRole): boolean {
    return this._value === other._value
  }
}
