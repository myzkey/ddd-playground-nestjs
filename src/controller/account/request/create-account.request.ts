import { IsNotEmpty, IsString, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateAccountRequest {
  @ApiProperty({
    description: 'アカウント名',
    example: '山田太郎',
  })
  @IsString({ message: 'アカウント名は文字列である必要があります' })
  @IsNotEmpty({ message: 'アカウント名は必須です' })
  name: string

  @ApiProperty({
    description: 'アカウントの役割',
    example: 'SHIPPER',
    enum: ['SHIPPER', 'COURIER'],
  })
  @IsString({ message: '役割は文字列である必要があります' })
  @IsIn(['SHIPPER', 'COURIER'], {
    message: '役割はSHIPPERまたはCOURIERである必要があります',
  })
  role: string
}
