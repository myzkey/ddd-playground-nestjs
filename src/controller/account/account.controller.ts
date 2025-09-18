import { Body, Controller, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CreateAccountRequest } from './request/create-account.request'
import { AccountResponse } from './response/account.response'
import { CreateAccountUseCase } from '~/app/account/create-account.usecase'

@ApiTags('Accounts')
@Controller('accounts')
export class AccountController {
  constructor(private readonly createAccountUseCase: CreateAccountUseCase) {}

  @Post()
  @ApiOperation({
    summary: 'アカウントの作成',
    description: '新しいアカウント（荷主または配達員）を作成します',
  })
  @ApiResponse({
    status: 201,
    description: 'アカウントが正常に作成されました',
    type: AccountResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'リクエストが不正です',
  })
  async create(
    @Body() request: CreateAccountRequest,
  ): Promise<AccountResponse> {
    const account = await this.createAccountUseCase.execute({
      name: request.name,
      role: request.role,
    })
    return AccountResponse.fromDomain(account)
  }
}
