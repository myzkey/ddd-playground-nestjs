import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AssignmentController } from '~/controller/assignment/assignment.controller'
import { AssignmentOrmEntity } from '~/infra/database/entity/assignment.orm-entity'
import { AssignmentRepository } from '~/infra/database/repository/assignment.repository'
import { OfferAssignmentUseCase } from '~/app/assignment/offer-assignment.usecase'
import { AcceptAssignmentUseCase } from '~/app/assignment/accept-assignment.usecase'
import { OrderModule } from './order.module'
import { DeliveryEventModule } from './delivery-event.module'
import { OrderRepository } from '~/infra/database/repository/order.repository'
import { DeliveryEventRepository } from '~/infra/database/repository/delivery-event.repository'

@Module({
  imports: [
    TypeOrmModule.forFeature([AssignmentOrmEntity]),
    OrderModule,
    DeliveryEventModule,
  ],
  controllers: [AssignmentController],
  providers: [
    AssignmentRepository,
    {
      provide: OfferAssignmentUseCase,
      useFactory: (
        orderRepository: OrderRepository,
        assignmentRepository: AssignmentRepository,
      ) => {
        return new OfferAssignmentUseCase(orderRepository, assignmentRepository)
      },
      inject: [OrderRepository, AssignmentRepository],
    },
    {
      provide: AcceptAssignmentUseCase,
      useFactory: (
        orderRepository: OrderRepository,
        assignmentRepository: AssignmentRepository,
        deliveryEventRepository: DeliveryEventRepository,
      ) => {
        return new AcceptAssignmentUseCase(
          orderRepository,
          assignmentRepository,
          deliveryEventRepository,
        )
      },
      inject: [OrderRepository, AssignmentRepository, DeliveryEventRepository],
    },
  ],
})
export class AssignmentModule {}
