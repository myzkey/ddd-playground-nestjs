import { IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class OfferAssignmentRequest {
  @ApiProperty({
    description: '注文ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: '注文IDは文字列である必要があります' })
  @IsNotEmpty({ message: '注文IDは必須です' })
  orderId: string

  @ApiProperty({
    description: '配達員ID',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @IsString({ message: '配達員IDは文字列である必要があります' })
  @IsNotEmpty({ message: '配達員IDは必須です' })
  courierId: string
}
