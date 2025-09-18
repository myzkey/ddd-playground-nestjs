import { Account } from './entity/account'
import { AccountId } from './vo/account-id'
import { AccountRole } from './vo/account-role'

export interface IAccountRepository {
  findById(id: AccountId): Promise<Account | null>
  findByRole(role: AccountRole): Promise<Account[]>
  save(account: Account): Promise<Account>
}
