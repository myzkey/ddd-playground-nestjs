import { Injectable } from '@nestjs/common'
import { IOrderRepository } from '~/domain/order/order-repository.interface'
import { IDeliveryEventRepository } from '~/domain/delivery-event/delivery-event-repository.interface'
import { Order } from '~/domain/order/entity/order'
import { OrderId } from '~/domain/order/vo/order-id'
import { OrderStatus } from '~/domain/order/vo/order-status'
import { AccountId } from '~/domain/account/vo/account-id'
import { Address } from '~/domain/order/vo/address'
import { TimeWindow } from '~/domain/order/vo/time-window'
import { Weight } from '~/domain/order/vo/weight'
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
export class PlaceOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly deliveryEventRepository: IDeliveryEventRepository,
  ) {}

  async execute(params: {
    shipperId: string
    pickupAddress: string
    dropoffAddress: string
    pickupStartAt?: Date | null
    pickupEndAt?: Date | null
    dropStartAt?: Date | null
    dropEndAt?: Date | null
    totalWeightKg?: number
    notes?: string
  }): Promise<Order> {
    const orderId = new OrderId(uuidv4())

    const order = new Order({
      id: orderId,
      shipperId: new AccountId(params.shipperId),
      status: new OrderStatus('PLACED'),
      pickupAddress: new Address(params.pickupAddress),
      dropoffAddress: new Address(params.dropoffAddress),
      pickupTimeWindow: new TimeWindow(
        params.pickupStartAt ?? null,
        params.pickupEndAt ?? null,
      ),
      dropoffTimeWindow: new TimeWindow(
        params.dropStartAt ?? null,
        params.dropEndAt ?? null,
      ),
      totalWeight: new Weight(params.totalWeightKg ?? 0),
      notes: params.notes,
    })

    const savedOrder = await this.orderRepository.save(order)

    // ドメインイベント発行
    const event = new DeliveryEvent({
      id: new DeliveryEventId(uuidv4()),
      orderId: orderId,
      type: new EventType(EventTypeValue.ORDER_PLACED),
      payloadJson: JSON.stringify({
        shipperId: params.shipperId,
        pickupAddress: params.pickupAddress,
        dropoffAddress: params.dropoffAddress,
      }),
    })

    await this.deliveryEventRepository.save(event)

    return savedOrder
  }
}
