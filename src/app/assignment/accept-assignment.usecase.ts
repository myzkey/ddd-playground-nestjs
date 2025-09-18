import { Injectable } from '@nestjs/common'
import { IOrderRepository } from '~/domain/order/order-repository.interface'
import { IAssignmentRepository } from '~/domain/assignment/assignment-repository.interface'
import { IDeliveryEventRepository } from '~/domain/delivery-event/delivery-event-repository.interface'
import { Assignment } from '~/domain/assignment/entity/assignment'
import { AssignmentId } from '~/domain/assignment/vo/assignment-id'
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
export class AcceptAssignmentUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly assignmentRepository: IAssignmentRepository,
    private readonly deliveryEventRepository: IDeliveryEventRepository,
  ) {}

  async execute(assignmentId: string): Promise<Assignment> {
    const assignment = await this.assignmentRepository.findById(
      new AssignmentId(assignmentId),
    )
    if (!assignment) {
      throw new Error('割当が見つかりません')
    }

    assignment.accept()

    const updatedAssignment = await this.assignmentRepository.update(assignment)

    // 注文ステータスをASSIGNEDに更新
    const order = await this.orderRepository.findById(assignment.orderId)
    if (!order) {
      throw new Error('注文が見つかりません')
    }

    order.assign()
    await this.orderRepository.update(order)

    // ドメインイベント発行
    const event = new DeliveryEvent({
      id: new DeliveryEventId(uuidv4()),
      orderId: assignment.orderId,
      courierId: assignment.courierId,
      type: new EventType(EventTypeValue.ASSIGNED),
      payloadJson: JSON.stringify({
        assignmentId: assignmentId,
        courierId: assignment.courierId.value,
      }),
    })

    await this.deliveryEventRepository.save(event)

    return updatedAssignment
  }
}
