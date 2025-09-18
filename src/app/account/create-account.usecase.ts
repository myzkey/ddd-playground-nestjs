import { Injectable } from '@nestjs/common'
import { IAccountRepository } from '~/domain/account/account-repository.interface'
import { Account } from '~/domain/account/entity/account'
import { AccountId } from '~/domain/account/vo/account-id'
import { AccountRole } from '~/domain/account/vo/account-role'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class CreateAccountUseCase {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(params: { name: string; role: string }): Promise<Account> {
    const account = new Account({
      id: new AccountId(uuidv4()),
      name: params.name,
      role: new AccountRole(params.role),
    })

    return await this.accountRepository.save(account)
  }
}
