import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DeliveryEventOrmEntity } from '~/infra/database/entity/delivery-event.orm-entity'
import { DeliveryEventRepository } from '~/infra/database/repository/delivery-event.repository'

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryEventOrmEntity])],
  providers: [DeliveryEventRepository],
  exports: [DeliveryEventRepository],
})
export class DeliveryEventModule {}
