import { DeliveryEvent, DeliveryEventId } from './entity/delivery-event'
import { OrderId } from '../order/vo/order-id'
import { EventType } from './vo/event-type'

export interface IDeliveryEventRepository {
  findById(id: DeliveryEventId): Promise<DeliveryEvent | null>
  findByOrderId(orderId: OrderId): Promise<DeliveryEvent[]>
  findByType(type: EventType): Promise<DeliveryEvent[]>
  save(event: DeliveryEvent): Promise<DeliveryEvent>
}
