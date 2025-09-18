import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DeliveryEventOrmEntity } from '../entity/delivery-event.orm-entity'
import { IDeliveryEventRepository } from '~/domain/delivery-event/delivery-event-repository.interface'
import {
  DeliveryEvent,
  DeliveryEventId,
} from '~/domain/delivery-event/entity/delivery-event'
import { OrderId } from '~/domain/order/vo/order-id'
import { AccountId } from '~/domain/account/vo/account-id'
import { EventType } from '~/domain/delivery-event/vo/event-type'

@Injectable()
export class DeliveryEventRepository implements IDeliveryEventRepository {
  constructor(
    @InjectRepository(DeliveryEventOrmEntity)
    private readonly deliveryEventRepository: Repository<DeliveryEventOrmEntity>,
  ) {}

  async findById(id: DeliveryEventId): Promise<DeliveryEvent | null> {
    const entity = await this.deliveryEventRepository.findOne({
      where: { id: id.value },
    })

    if (!entity) {
      return null
    }

    return this.toDomain(entity)
  }

  async findByOrderId(orderId: OrderId): Promise<DeliveryEvent[]> {
    const entities = await this.deliveryEventRepository.find({
      where: { orderId: orderId.value },
      order: { occurredAt: 'ASC' },
    })

    return entities.map((entity) => this.toDomain(entity))
  }

  async findByType(type: EventType): Promise<DeliveryEvent[]> {
    const entities = await this.deliveryEventRepository.find({
      where: { type: type.value },
      order: { occurredAt: 'DESC' },
    })

    return entities.map((entity) => this.toDomain(entity))
  }

  async save(event: DeliveryEvent): Promise<DeliveryEvent> {
    const entity = this.toEntity(event)
    const savedEntity = await this.deliveryEventRepository.save(entity)
    return this.toDomain(savedEntity)
  }

  private toDomain(entity: DeliveryEventOrmEntity): DeliveryEvent {
    return new DeliveryEvent({
      id: new DeliveryEventId(entity.id),
      orderId: new OrderId(entity.orderId),
      courierId: entity.courierId ? new AccountId(entity.courierId) : null,
      type: new EventType(entity.type),
      payloadJson: entity.payloadJson,
      occurredAt: entity.occurredAt,
    })
  }

  private toEntity(domain: DeliveryEvent): DeliveryEventOrmEntity {
    const entity = new DeliveryEventOrmEntity()
    entity.id = domain.id.value
    entity.orderId = domain.orderId.value
    entity.courierId = domain.courierId?.value ?? null
    entity.type = domain.type.value
    entity.payloadJson = domain.payloadJson
    entity.occurredAt = domain.occurredAt
    return entity
  }
}
