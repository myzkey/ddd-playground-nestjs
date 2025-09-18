export enum AssignmentStatusType {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class AssignmentStatus {
  private readonly _value: AssignmentStatusType

  constructor(value: string) {
    if (
      !Object.values(AssignmentStatusType).includes(
        value as AssignmentStatusType,
      )
    ) {
      throw new Error(`無効な割り当てステータスです: ${value}`)
    }
    this._value = value as AssignmentStatusType
  }

  get value(): AssignmentStatusType {
    return this._value
  }

  isActive(): boolean {
    return (
      this._value === AssignmentStatusType.PENDING ||
      this._value === AssignmentStatusType.ACCEPTED
    )
  }

  isPending(): boolean {
    return this._value === AssignmentStatusType.PENDING
  }

  isAccepted(): boolean {
    return this._value === AssignmentStatusType.ACCEPTED
  }

  isRejected(): boolean {
    return this._value === AssignmentStatusType.REJECTED
  }

  isCompleted(): boolean {
    return this._value === AssignmentStatusType.COMPLETED
  }

  equals(other: AssignmentStatus): boolean {
    return this._value === other._value
  }
}
