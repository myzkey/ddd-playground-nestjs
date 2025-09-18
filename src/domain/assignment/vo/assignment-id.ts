export class AssignmentId {
  private readonly _value: string

  constructor(value: string) {
    if (!value) {
      throw new Error('AssignmentIdは必須です')
    }
    this._value = value
  }

  get value(): string {
    return this._value
  }

  equals(other: AssignmentId): boolean {
    return this._value === other._value
  }
}
