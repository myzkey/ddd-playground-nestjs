import { ApiProperty } from '@nestjs/swagger'
import { Order } from '~/domain/order/entity/order'

export class OrderResponse {
  @ApiProperty({
    description: '注文ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string

  @ApiProperty({
    description: '荷主ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  shipperId: string

  @ApiProperty({
    description: '注文ステータス',
    example: 'PLACED',
    enum: ['PLACED', 'READY_TO_SHIP', 'ASSIGNED', 'DELIVERED', 'CANCELLED'],
  })
  status: string

  @ApiProperty({
    description: '集荷場所',
    example: '東京都渋谷区1-1-1',
  })
  pickupAddress: string

  @ApiProperty({
    description: '配達場所',
    example: '東京都新宿区2-2-2',
  })
  dropoffAddress: string

  @ApiProperty({
    description: '集荷開始時間',
    example: '2024-01-01T09:00:00.000Z',
    nullable: true,
  })
  pickupStartAt: Date | null

  @ApiProperty({
    description: '集荷終了時間',
    example: '2024-01-01T12:00:00.000Z',
    nullable: true,
  })
  pickupEndAt: Date | null

  @ApiProperty({
    description: '配達開始時間',
    example: '2024-01-01T14:00:00.000Z',
    nullable: true,
  })
  dropStartAt: Date | null

  @ApiProperty({
    description: '配達終了時間',
    example: '2024-01-01T18:00:00.000Z',
    nullable: true,
  })
  dropEndAt: Date | null

  @ApiProperty({
    description: '総重量（kg）',
    example: 5.5,
  })
  totalWeightKg: number

  @ApiProperty({
    description: '備考',
    example: '割れ物注意',
    nullable: true,
  })
  notes: string | null

  @ApiProperty({
    description: '作成日時',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date

  static fromDomain(order: Order): OrderResponse {
    const response = new OrderResponse()
    response.id = order.id.value
    response.shipperId = order.shipperId.value
    response.status = order.status.value
    response.pickupAddress = order.pickupAddress.value
    response.dropoffAddress = order.dropoffAddress.value
    response.pickupStartAt = order.pickupTimeWindow.startAt
    response.pickupEndAt = order.pickupTimeWindow.endAt
    response.dropStartAt = order.dropoffTimeWindow.startAt
    response.dropEndAt = order.dropoffTimeWindow.endAt
    response.totalWeightKg = order.totalWeight.valueInKg
    response.notes = order.notes
    response.createdAt = order.createdAt
    return response
  }
}
