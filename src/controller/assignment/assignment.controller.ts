import { Body, Controller, Post, Param, Put } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { OfferAssignmentRequest } from './request/offer-assignment.request'
import { AssignmentResponse } from './response/assignment.response'
import { OfferAssignmentUseCase } from '~/app/assignment/offer-assignment.usecase'
import { AcceptAssignmentUseCase } from '~/app/assignment/accept-assignment.usecase'

@ApiTags('Assignments')
@Controller('assignments')
export class AssignmentController {
  constructor(
    private readonly offerAssignmentUseCase: OfferAssignmentUseCase,
    private readonly acceptAssignmentUseCase: AcceptAssignmentUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: '配達員への割当提案',
    description: '指定した配達員に注文の配達を提案します',
  })
  @ApiResponse({
    status: 201,
    description: '割当が正常に作成されました',
    type: AssignmentResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'リクエストが不正です',
  })
  async offer(
    @Body() request: OfferAssignmentRequest,
  ): Promise<AssignmentResponse> {
    const assignment = await this.offerAssignmentUseCase.execute({
      orderId: request.orderId,
      courierId: request.courierId,
    })
    return AssignmentResponse.fromDomain(assignment)
  }

  @Put(':id/accept')
  @ApiOperation({
    summary: '割当の受諾',
    description: '配達員が割当を受諾します',
  })
  @ApiResponse({
    status: 200,
    description: '割当が受諾されました',
    type: AssignmentResponse,
  })
  @ApiResponse({
    status: 404,
    description: '割当が見つかりません',
  })
  async accept(@Param('id') id: string): Promise<AssignmentResponse> {
    const assignment = await this.acceptAssignmentUseCase.execute(id)
    return AssignmentResponse.fromDomain(assignment)
  }
}
