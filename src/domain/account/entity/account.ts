import { AccountId } from '../vo/account-id'
import { AccountRole } from '../vo/account-role'

export class Account {
  private readonly _id: AccountId
  private readonly _name: string
  private readonly _role: AccountRole
  private readonly _createdAt: Date

  constructor(props: {
    id: AccountId
    name: string
    role: AccountRole
    createdAt?: Date
  }) {
    if (!props.name || props.name.trim() === '') {
      throw new Error('名前は必須です')
    }
    this._id = props.id
    this._name = props.name
    this._role = props.role
    this._createdAt = props.createdAt ?? new Date()
  }

  get id(): AccountId {
    return this._id
  }

  get name(): string {
    return this._name
  }

  get role(): AccountRole {
    return this._role
  }

  get createdAt(): Date {
    return this._createdAt
  }

  isShipper(): boolean {
    return this._role.isShipper()
  }

  isCourier(): boolean {
    return this._role.isCourier()
  }
}
