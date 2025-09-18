import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsDate,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class PlaceOrderRequest {
  @ApiProperty({
    description: '荷主ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: '荷主IDは文字列である必要があります' })
  @IsNotEmpty({ message: '荷主IDは必須です' })
  shipperId: string

  @ApiProperty({
    description: '集荷場所',
    example: '東京都渋谷区1-1-1',
  })
  @IsString({ message: '集荷場所は文字列である必要があります' })
  @IsNotEmpty({ message: '集荷場所は必須です' })
  pickupAddress: string

  @ApiProperty({
    description: '配達場所',
    example: '東京都新宿区2-2-2',
  })
  @IsString({ message: '配達場所は文字列である必要があります' })
  @IsNotEmpty({ message: '配達場所は必須です' })
  dropoffAddress: string

  @ApiProperty({
    description: '集荷開始時間',
    example: '2024-01-01T09:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDate({ message: '集荷開始時間は日時形式である必要があります' })
  @Type(() => Date)
  pickupStartAt?: Date

  @ApiProperty({
    description: '集荷終了時間',
    example: '2024-01-01T12:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDate({ message: '集荷終了時間は日時形式である必要があります' })
  @Type(() => Date)
  pickupEndAt?: Date

  @ApiProperty({
    description: '配達開始時間',
    example: '2024-01-01T14:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDate({ message: '配達開始時間は日時形式である必要があります' })
  @Type(() => Date)
  dropStartAt?: Date

  @ApiProperty({
    description: '配達終了時間',
    example: '2024-01-01T18:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDate({ message: '配達終了時間は日時形式である必要があります' })
  @Type(() => Date)
  dropEndAt?: Date

  @ApiProperty({
    description: '総重量（kg）',
    example: 5.5,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: '総重量は数値である必要があります' })
  @Min(0, { message: '総重量は0以上である必要があります' })
  totalWeightKg?: number

  @ApiProperty({
    description: '備考',
    example: '割れ物注意',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '備考は文字列である必要があります' })
  notes?: string
}
