import { Body, Controller, Post, Param, Put } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { PlaceOrderRequest } from './request/place-order.request'
import { OrderResponse } from './response/order.response'
import { PlaceOrderUseCase } from '~/app/order/place-order.usecase'
import { MarkReadyToShipUseCase } from '~/app/order/mark-ready-to-ship.usecase'
import { DeliverOrderUseCase } from '~/app/order/deliver-order.usecase'

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(
    private readonly placeOrderUseCase: PlaceOrderUseCase,
    private readonly markReadyToShipUseCase: MarkReadyToShipUseCase,
    private readonly deliverOrderUseCase: DeliverOrderUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: '注文の作成',
    description: '新しい配送注文を作成します',
  })
  @ApiResponse({
    status: 201,
    description: '注文が正常に作成されました',
    type: OrderResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'リクエストが不正です',
  })
  async place(@Body() request: PlaceOrderRequest): Promise<OrderResponse> {
    const order = await this.placeOrderUseCase.execute({
      shipperId: request.shipperId,
      pickupAddress: request.pickupAddress,
      dropoffAddress: request.dropoffAddress,
      pickupStartAt: request.pickupStartAt,
      pickupEndAt: request.pickupEndAt,
      dropStartAt: request.dropStartAt,
      dropEndAt: request.dropEndAt,
      totalWeightKg: request.totalWeightKg,
      notes: request.notes,
    })
    return OrderResponse.fromDomain(order)
  }

  @Put(':id/ready-to-ship')
  @ApiOperation({
    summary: '注文を出荷準備完了にする',
    description: '注文のステータスをREADY_TO_SHIPに変更します',
  })
  @ApiResponse({
    status: 200,
    description: '注文が出荷準備完了になりました',
    type: OrderResponse,
  })
  @ApiResponse({
    status: 404,
    description: '注文が見つかりません',
  })
  async markReadyToShip(@Param('id') id: string): Promise<OrderResponse> {
    const order = await this.markReadyToShipUseCase.execute(id)
    return OrderResponse.fromDomain(order)
  }

  @Put(':id/deliver')
  @ApiOperation({
    summary: '注文の配達完了',
    description: '注文のステータスをDELIVEREDに変更します',
  })
  @ApiResponse({
    status: 200,
    description: '注文が配達完了になりました',
    type: OrderResponse,
  })
  @ApiResponse({
    status: 404,
    description: '注文が見つかりません',
  })
  async deliver(
    @Param('id') id: string,
    @Body() body: { courierId: string },
  ): Promise<OrderResponse> {
    const order = await this.deliverOrderUseCase.execute({
      orderId: id,
      courierId: body.courierId,
    })
    return OrderResponse.fromDomain(order)
  }
}
