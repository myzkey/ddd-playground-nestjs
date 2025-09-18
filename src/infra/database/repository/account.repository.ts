import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AccountOrmEntity } from '../entity/account.orm-entity'
import { IAccountRepository } from '~/domain/account/account-repository.interface'
import { Account } from '~/domain/account/entity/account'
import { AccountId } from '~/domain/account/vo/account-id'
import { AccountRole } from '~/domain/account/vo/account-role'

@Injectable()
export class AccountRepository implements IAccountRepository {
  constructor(
    @InjectRepository(AccountOrmEntity)
    private readonly accountRepository: Repository<AccountOrmEntity>,
  ) {}

  async findById(id: AccountId): Promise<Account | null> {
    const entity = await this.accountRepository.findOne({
      where: { id: id.value },
    })

    if (!entity) {
      return null
    }

    return this.toDomain(entity)
  }

  async findByRole(role: AccountRole): Promise<Account[]> {
    const entities = await this.accountRepository.find({
      where: { role: role.value },
    })

    return entities.map((entity) => this.toDomain(entity))
  }

  async save(account: Account): Promise<Account> {
    const entity = this.toEntity(account)
    const savedEntity = await this.accountRepository.save(entity)
    return this.toDomain(savedEntity)
  }

  private toDomain(entity: AccountOrmEntity): Account {
    return new Account({
      id: new AccountId(entity.id),
      name: entity.name,
      role: new AccountRole(entity.role),
      createdAt: entity.createdAt,
    })
  }

  private toEntity(domain: Account): AccountOrmEntity {
    const entity = new AccountOrmEntity()
    entity.id = domain.id.value
    entity.name = domain.name
    entity.role = domain.role.value
    entity.createdAt = domain.createdAt
    return entity
  }
}
