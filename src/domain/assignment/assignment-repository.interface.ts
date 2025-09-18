import { Assignment } from './entity/assignment'
import { AssignmentId } from './vo/assignment-id'
import { OrderId } from '../order/vo/order-id'
import { AccountId } from '../account/vo/account-id'

export interface IAssignmentRepository {
  findById(id: AssignmentId): Promise<Assignment | null>
  findByOrderId(orderId: OrderId): Promise<Assignment | null>
  findByCourierId(courierId: AccountId): Promise<Assignment[]>
  findActiveByOrderId(orderId: OrderId): Promise<Assignment | null>
  save(assignment: Assignment): Promise<Assignment>
  update(assignment: Assignment): Promise<Assignment>
}
