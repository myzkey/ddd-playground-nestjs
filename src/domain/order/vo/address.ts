export class Address {
  private readonly _value: string

  constructor(value: string) {
    if (!value || value.trim() === '') {
      throw new Error('住所は必須です')
    }
    this._value = value.trim()
  }

  get value(): string {
    return this._value
  }

  equals(other: Address): boolean {
    return this._value === other._value
  }
}
