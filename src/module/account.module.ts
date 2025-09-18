import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AccountController } from '~/controller/account/account.controller'
import { AccountOrmEntity } from '~/infra/database/entity/account.orm-entity'
import { AccountRepository } from '~/infra/database/repository/account.repository'
import { CreateAccountUseCase } from '~/app/account/create-account.usecase'

@Module({
  imports: [TypeOrmModule.forFeature([AccountOrmEntity])],
  controllers: [AccountController],
  providers: [
    AccountRepository,
    {
      provide: CreateAccountUseCase,
      useFactory: (accountRepository: AccountRepository) => {
        return new CreateAccountUseCase(accountRepository)
      },
      inject: [AccountRepository],
    },
  ],
  exports: [AccountRepository],
})
export class AccountModule {}
