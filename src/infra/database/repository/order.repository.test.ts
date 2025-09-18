import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Repository } from 'typeorm'
import { OrderRepository } from './order.repository'
import { OrderOrmEntity } from '../entity/order.orm-entity'
import { Order } from '~/domain/order/entity/order'
import { OrderId } from '~/domain/order/vo/order-id'
import { OrderStatus } from '~/domain/order/vo/order-status'
import { AccountId } from '~/domain/account/vo/account-id'
import { Address } from '~/domain/order/vo/address'
import { TimeWindow } from '~/domain/order/vo/time-window'
import { Weight } from '~/domain/order/vo/weight'

// TypeORMのRepositoryをモック
const mockTypeOrmRepository: Partial<Repository<OrderOrmEntity>> = {
  findOne: vi.fn(),
  find: vi.fn(),
  save: vi.fn(),
}

describe('OrderRepository', () => {
  let repository: OrderRepository

  beforeEach(() => {
    repository = new OrderRepository(mockTypeOrmRepository as Repository<OrderOrmEntity>)
    vi.clearAllMocks()
  })

  const createMockOrmEntity = (): OrderOrmEntity => ({
    id: 'order-123',
    shipperId: 'shipper-123',
    status: 'PLACED',
    pickupAddress: '東京都渋谷区1-1-1',
    dropoffAddress: '東京都新宿区2-2-2',
    pickupStartAt: new Date('2024-01-01T09:00:00Z'),
    pickupEndAt: new Date('2024-01-01T12:00:00Z'),
    dropStartAt: new Date('2024-01-01T14:00:00Z'),
    dropEndAt: new Date('2024-01-01T18:00:00Z'),
    totalWeightKg: 5.5,
    notes: '割れ物注意',
    createdAt: new Date('2024-01-01T00:00:00Z'),
  })

  const createMockDomainOrder = (): Order => {
    return new Order({
      id: new OrderId('order-123'),
      shipperId: new AccountId('shipper-123'),
      status: new OrderStatus('PLACED'),
      pickupAddress: new Address('東京都渋谷区1-1-1'),
      dropoffAddress: new Address('東京都新宿区2-2-2'),
      pickupTimeWindow: new TimeWindow(
        new Date('2024-01-01T09:00:00Z'),
        new Date('2024-01-01T12:00:00Z')
      ),
      dropoffTimeWindow: new TimeWindow(
        new Date('2024-01-01T14:00:00Z'),
        new Date('2024-01-01T18:00:00Z')
      ),
      totalWeight: new Weight(5.5),
      notes: '割れ物注意',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    })
  }

  describe('findById', () => {
    it('IDで注文を取得できる', async () => {
      // Arrange
      const mockEntity = createMockOrmEntity()
      vi.mocked(mockTypeOrmRepository.findOne).mockResolvedValue(mockEntity)

      // Act
      const result = await repository.findById(new OrderId('order-123'))

      // Assert
      expect(mockTypeOrmRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-123' }
      })
      expect(result).toBeInstanceOf(Order)
      expect(result!.id.value).toBe('order-123')
      expect(result!.status.value).toBe('PLACED')
    })

    it('存在しない場合はnullを返す', async () => {
      // Arrange
      vi.mocked(mockTypeOrmRepository.findOne).mockResolvedValue(null)

      // Act
      const result = await repository.findById(new OrderId('non-existent'))

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('save', () => {
    it('ドメインオブジェクトを保存できる', async () => {
      // Arrange
      const domainOrder = createMockDomainOrder()
      const mockSavedEntity = createMockOrmEntity()
      vi.mocked(mockTypeOrmRepository.save).mockResolvedValue(mockSavedEntity)

      // Act
      const result = await repository.save(domainOrder)

      // Assert
      expect(mockTypeOrmRepository.save).toHaveBeenCalledOnce()
      const savedEntity = vi.mocked(mockTypeOrmRepository.save).mock.calls[0][0]
      expect(savedEntity.id).toBe('order-123')
      expect(savedEntity.status).toBe('PLACED')
      expect(savedEntity.pickupAddress).toBe('東京都渋谷区1-1-1')
      
      expect(result).toBeInstanceOf(Order)
      expect(result.id.value).toBe('order-123')
    })
  })

  describe('ドメインとORMの変換', () => {
    it('ORMエンティティからドメインオブジェクトに正しく変換される', async () => {
      // Arrange
      const mockEntity = createMockOrmEntity()
      vi.mocked(mockTypeOrmRepository.findOne).mockResolvedValue(mockEntity)

      // Act
      const result = await repository.findById(new OrderId('order-123'))

      // Assert
      expect(result!.id.value).toBe(mockEntity.id)
      expect(result!.shipperId.value).toBe(mockEntity.shipperId)
      expect(result!.status.value).toBe(mockEntity.status)
      expect(result!.pickupAddress.value).toBe(mockEntity.pickupAddress)
      expect(result!.dropoffAddress.value).toBe(mockEntity.dropoffAddress)
      expect(result!.totalWeight.valueInKg).toBe(mockEntity.totalWeightKg)
      expect(result!.notes).toBe(mockEntity.notes)
      expect(result!.createdAt).toEqual(mockEntity.createdAt)
    })

    it('ドメインオブジェクトからORMエンティティに正しく変換される', async () => {
      // Arrange
      const domainOrder = createMockDomainOrder()
      const mockSavedEntity = createMockOrmEntity()
      vi.mocked(mockTypeOrmRepository.save).mockResolvedValue(mockSavedEntity)

      // Act
      await repository.save(domainOrder)

      // Assert
      const savedEntity = vi.mocked(mockTypeOrmRepository.save).mock.calls[0][0]
      expect(savedEntity.id).toBe(domainOrder.id.value)
      expect(savedEntity.shipperId).toBe(domainOrder.shipperId.value)
      expect(savedEntity.status).toBe(domainOrder.status.value)
      expect(savedEntity.pickupAddress).toBe(domainOrder.pickupAddress.value)
      expect(savedEntity.dropoffAddress).toBe(domainOrder.dropoffAddress.value)
      expect(savedEntity.totalWeightKg).toBe(domainOrder.totalWeight.valueInKg)
      expect(savedEntity.notes).toBe(domainOrder.notes)
      expect(savedEntity.createdAt).toEqual(domainOrder.createdAt)
    })
  })
})