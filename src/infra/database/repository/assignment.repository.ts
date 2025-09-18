import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AssignmentOrmEntity } from '../entity/assignment.orm-entity'
import { IAssignmentRepository } from '~/domain/assignment/assignment-repository.interface'
import { Assignment } from '~/domain/assignment/entity/assignment'
import { AssignmentId } from '~/domain/assignment/vo/assignment-id'
import { AssignmentStatus } from '~/domain/assignment/vo/assignment-status'
import { OrderId } from '~/domain/order/vo/order-id'
import { AccountId } from '~/domain/account/vo/account-id'

@Injectable()
export class AssignmentRepository implements IAssignmentRepository {
  constructor(
    @InjectRepository(AssignmentOrmEntity)
    private readonly assignmentRepository: Repository<AssignmentOrmEntity>,
  ) {}

  async findById(id: AssignmentId): Promise<Assignment | null> {
    const entity = await this.assignmentRepository.findOne({
      where: { id: id.value },
    })

    if (!entity) {
      return null
    }

    return this.toDomain(entity)
  }

  async findByOrderId(orderId: OrderId): Promise<Assignment | null> {
    const entity = await this.assignmentRepository.findOne({
      where: { orderId: orderId.value },
    })

    if (!entity) {
      return null
    }

    return this.toDomain(entity)
  }

  async findByCourierId(courierId: AccountId): Promise<Assignment[]> {
    const entities = await this.assignmentRepository.find({
      where: { courierId: courierId.value },
    })

    return entities.map((entity) => this.toDomain(entity))
  }

  async findActiveByOrderId(orderId: OrderId): Promise<Assignment | null> {
    const entity = await this.assignmentRepository.findOne({
      where: {
        orderId: orderId.value,
        status: 'PENDING' || 'ACCEPTED',
      },
    })

    if (!entity) {
      return null
    }

    return this.toDomain(entity)
  }

  async save(assignment: Assignment): Promise<Assignment> {
    const entity = this.toEntity(assignment)
    const savedEntity = await this.assignmentRepository.save(entity)
    return this.toDomain(savedEntity)
  }

  async update(assignment: Assignment): Promise<Assignment> {
    const entity = this.toEntity(assignment)
    const updatedEntity = await this.assignmentRepository.save(entity)
    return this.toDomain(updatedEntity)
  }

  private toDomain(entity: AssignmentOrmEntity): Assignment {
    return new Assignment({
      id: new AssignmentId(entity.id),
      orderId: new OrderId(entity.orderId),
      courierId: new AccountId(entity.courierId),
      status: new AssignmentStatus(entity.status),
      offeredAt: entity.offeredAt,
      respondedAt: entity.respondedAt,
    })
  }

  private toEntity(domain: Assignment): AssignmentOrmEntity {
    const entity = new AssignmentOrmEntity()
    entity.id = domain.id.value
    entity.orderId = domain.orderId.value
    entity.courierId = domain.courierId.value
    entity.status = domain.status.value
    entity.offeredAt = domain.offeredAt
    entity.respondedAt = domain.respondedAt
    return entity
  }
}
