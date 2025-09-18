import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { OrderOrmEntity } from '../entity/order.orm-entity'
import { IOrderRepository } from '~/domain/order/order-repository.interface'
import { Order } from '~/domain/order/entity/order'
import { OrderId } from '~/domain/order/vo/order-id'
import { OrderStatus } from '~/domain/order/vo/order-status'
import { AccountId } from '~/domain/account/vo/account-id'
import { Address } from '~/domain/order/vo/address'
import { TimeWindow } from '~/domain/order/vo/time-window'
import { Weight } from '~/domain/order/vo/weight'

@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(
    @InjectRepository(OrderOrmEntity)
    private readonly orderRepository: Repository<OrderOrmEntity>,
  ) {}

  async findById(id: OrderId): Promise<Order | null> {
    const entity = await this.orderRepository.findOne({
      where: { id: id.value },
    })

    if (!entity) {
      return null
    }

    return this.toDomain(entity)
  }

  async findByShipperId(shipperId: AccountId): Promise<Order[]> {
    const entities = await this.orderRepository.find({
      where: { shipperId: shipperId.value },
    })

    return entities.map((entity) => this.toDomain(entity))
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const entities = await this.orderRepository.find({
      where: { status: status.value },
    })

    return entities.map((entity) => this.toDomain(entity))
  }

  async save(order: Order): Promise<Order> {
    const entity = this.toEntity(order)
    const savedEntity = await this.orderRepository.save(entity)
    return this.toDomain(savedEntity)
  }

  async update(order: Order): Promise<Order> {
    const entity = this.toEntity(order)
    const updatedEntity = await this.orderRepository.save(entity)
    return this.toDomain(updatedEntity)
  }

  private toDomain(entity: OrderOrmEntity): Order {
    return new Order({
      id: new OrderId(entity.id),
      shipperId: new AccountId(entity.shipperId),
      status: new OrderStatus(entity.status),
      pickupAddress: new Address(entity.pickupAddress),
      dropoffAddress: new Address(entity.dropoffAddress),
      pickupTimeWindow: new TimeWindow(
        entity.pickupStartAt,
        entity.pickupEndAt,
      ),
      dropoffTimeWindow: new TimeWindow(entity.dropStartAt, entity.dropEndAt),
      totalWeight: new Weight(entity.totalWeightKg),
      notes: entity.notes,
      createdAt: entity.createdAt,
    })
  }

  private toEntity(domain: Order): OrderOrmEntity {
    const entity = new OrderOrmEntity()
    entity.id = domain.id.value
    entity.shipperId = domain.shipperId.value
    entity.status = domain.status.value
    entity.pickupAddress = domain.pickupAddress.value
    entity.dropoffAddress = domain.dropoffAddress.value
    entity.pickupStartAt = domain.pickupTimeWindow.startAt
    entity.pickupEndAt = domain.pickupTimeWindow.endAt
    entity.dropStartAt = domain.dropoffTimeWindow.startAt
    entity.dropEndAt = domain.dropoffTimeWindow.endAt
    entity.totalWeightKg = domain.totalWeight.valueInKg
    entity.notes = domain.notes
    entity.createdAt = domain.createdAt
    return entity
  }
}
