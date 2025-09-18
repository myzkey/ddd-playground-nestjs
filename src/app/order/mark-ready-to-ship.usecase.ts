import { Injectable } from '@nestjs/common'
import { IOrderRepository } from '~/domain/order/order-repository.interface'
import { IDeliveryEventRepository } from '~/domain/delivery-event/delivery-event-repository.interface'
import { Order } from '~/domain/order/entity/order'
import { OrderId } from '~/domain/order/vo/order-id'
import {
  DeliveryEvent,
  DeliveryEventId,
} from '~/domain/delivery-event/entity/delivery-event'
import {
  EventType,
  EventTypeValue,
} from '~/domain/delivery-event/vo/event-type'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class MarkReadyToShipUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly deliveryEventRepository: IDeliveryEventRepository,
  ) {}

  async execute(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findById(new OrderId(orderId))
    if (!order) {
      throw new Error('注文が見つかりません')
    }

    order.markReadyToShip()

    const updatedOrder = await this.orderRepository.update(order)

    // ドメインイベント発行
    const event = new DeliveryEvent({
      id: new DeliveryEventId(uuidv4()),
      orderId: order.id,
      type: new EventType(EventTypeValue.READY_TO_SHIP),
      payloadJson: JSON.stringify({
        status: 'READY_TO_SHIP',
      }),
    })

    await this.deliveryEventRepository.save(event)

    return updatedOrder
  }
}
