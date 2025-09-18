export class Weight {
  private readonly _valueInKg: number

  constructor(valueInKg: number) {
    if (valueInKg < 0) {
      throw new Error('重量は0以上である必要があります')
    }
    this._valueInKg = valueInKg
  }

  get valueInKg(): number {
    return this._valueInKg
  }

  equals(other: Weight): boolean {
    return this._valueInKg === other._valueInKg
  }
}
