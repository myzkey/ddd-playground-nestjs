import { ApiProperty } from '@nestjs/swagger'
import { Account } from '~/domain/account/entity/account'

export class AccountResponse {
  @ApiProperty({
    description: 'アカウントID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string

  @ApiProperty({
    description: 'アカウント名',
    example: '山田太郎',
  })
  name: string

  @ApiProperty({
    description: 'アカウントの役割',
    example: 'SHIPPER',
    enum: ['SHIPPER', 'COURIER'],
  })
  role: string

  @ApiProperty({
    description: '作成日時',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date

  static fromDomain(account: Account): AccountResponse {
    const response = new AccountResponse()
    response.id = account.id.value
    response.name = account.name
    response.role = account.role.value
    response.createdAt = account.createdAt
    return response
  }
}
