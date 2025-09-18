import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OrderController } from '~/controller/order/order.controller'
import { OrderOrmEntity } from '~/infra/database/entity/order.orm-entity'
import { OrderRepository } from '~/infra/database/repository/order.repository'
import { PlaceOrderUseCase } from '~/app/order/place-order.usecase'
import { MarkReadyToShipUseCase } from '~/app/order/mark-ready-to-ship.usecase'
import { DeliverOrderUseCase } from '~/app/order/deliver-order.usecase'
import { DeliveryEventModule } from './delivery-event.module'
import { DeliveryEventRepository } from '~/infra/database/repository/delivery-event.repository'

@Module({
  imports: [TypeOrmModule.forFeature([OrderOrmEntity]), DeliveryEventModule],
  controllers: [OrderController],
  providers: [
    OrderRepository,
    {
      provide: PlaceOrderUseCase,
      useFactory: (
        orderRepository: OrderRepository,
        deliveryEventRepository: DeliveryEventRepository,
      ) => {
        return new PlaceOrderUseCase(orderRepository, deliveryEventRepository)
      },
      inject: [OrderRepository, DeliveryEventRepository],
    },
    {
      provide: MarkReadyToShipUseCase,
      useFactory: (
        orderRepository: OrderRepository,
        deliveryEventRepository: DeliveryEventRepository,
      ) => {
        return new MarkReadyToShipUseCase(
          orderRepository,
          deliveryEventRepository,
        )
      },
      inject: [OrderRepository, DeliveryEventRepository],
    },
    {
      provide: DeliverOrderUseCase,
      useFactory: (
        orderRepository: OrderRepository,
        deliveryEventRepository: DeliveryEventRepository,
      ) => {
        return new DeliverOrderUseCase(orderRepository, deliveryEventRepository)
      },
      inject: [OrderRepository, DeliveryEventRepository],
    },
  ],
  exports: [OrderRepository],
})
export class OrderModule {}
