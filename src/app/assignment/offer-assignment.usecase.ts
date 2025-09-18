import { Injectable } from '@nestjs/common'
import { IOrderRepository } from '~/domain/order/order-repository.interface'
import { IAssignmentRepository } from '~/domain/assignment/assignment-repository.interface'
import { Assignment } from '~/domain/assignment/entity/assignment'
import { AssignmentId } from '~/domain/assignment/vo/assignment-id'
import { AssignmentStatus } from '~/domain/assignment/vo/assignment-status'
import { OrderId } from '~/domain/order/vo/order-id'
import { AccountId } from '~/domain/account/vo/account-id'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class OfferAssignmentUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly assignmentRepository: IAssignmentRepository,
  ) {}

  async execute(params: {
    orderId: string
    courierId: string
  }): Promise<Assignment> {
    const order = await this.orderRepository.findById(
      new OrderId(params.orderId),
    )
    if (!order) {
      throw new Error('注文が見つかりません')
    }

    // ビジネスルール: READY_TO_SHIP状態のみ割当可能
    if (!order.canBeAssigned()) {
      throw new Error(
        'この注文は割当できません。状態がREADY_TO_SHIPである必要があります',
      )
    }

    // 既存のアクティブな割当をチェック
    const existingAssignment =
      await this.assignmentRepository.findActiveByOrderId(order.id)
    if (existingAssignment) {
      throw new Error('この注文には既にアクティブな割当があります')
    }

    const assignment = new Assignment({
      id: new AssignmentId(uuidv4()),
      orderId: order.id,
      courierId: new AccountId(params.courierId),
      status: new AssignmentStatus('PENDING'),
    })

    return await this.assignmentRepository.save(assignment)
  }
}
