export class AccountId {
  private readonly _value: string

  constructor(value: string) {
    if (!value) {
      throw new Error('AccountIdは必須です')
    }
    this._value = value
  }

  get value(): string {
    return this._value
  }

  equals(other: AccountId): boolean {
    return this._value === other._value
  }
}
