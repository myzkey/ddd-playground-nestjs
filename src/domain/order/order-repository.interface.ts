import { Order } from './entity/order'
import { OrderId } from './vo/order-id'
import { OrderStatus } from './vo/order-status'
import { AccountId } from '../account/vo/account-id'

export interface IOrderRepository {
  findById(id: OrderId): Promise<Order | null>
  findByShipperId(shipperId: AccountId): Promise<Order[]>
  findByStatus(status: OrderStatus): Promise<Order[]>
  save(order: Order): Promise<Order>
  update(order: Order): Promise<Order>
}
