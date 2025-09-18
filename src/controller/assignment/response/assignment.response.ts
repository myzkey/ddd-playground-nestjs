import { ApiProperty } from '@nestjs/swagger'
import { Assignment } from '~/domain/assignment/entity/assignment'

export class AssignmentResponse {
  @ApiProperty({
    description: '割当ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string

  @ApiProperty({
    description: '注文ID',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  orderId: string

  @ApiProperty({
    description: '配達員ID',
    example: '789e1234-e89b-12d3-a456-426614174002',
  })
  courierId: string

  @ApiProperty({
    description: '割当ステータス',
    example: 'PENDING',
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'],
  })
  status: string

  @ApiProperty({
    description: '提案日時',
    example: '2024-01-01T00:00:00.000Z',
  })
  offeredAt: Date

  @ApiProperty({
    description: '回答日時',
    example: '2024-01-01T01:00:00.000Z',
    nullable: true,
  })
  respondedAt: Date | null

  static fromDomain(assignment: Assignment): AssignmentResponse {
    const response = new AssignmentResponse()
    response.id = assignment.id.value
    response.orderId = assignment.orderId.value
    response.courierId = assignment.courierId.value
    response.status = assignment.status.value
    response.offeredAt = assignment.offeredAt
    response.respondedAt = assignment.respondedAt
    return response
  }
}
