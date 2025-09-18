import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OfferAssignmentUseCase } from './offer-assignment.usecase'
import { IOrderRepository } from '~/domain/order/order-repository.interface'
import { IAssignmentRepository } from '~/domain/assignment/assignment-repository.interface'
import { Order } from '~/domain/order/entity/order'
import { OrderId } from '~/domain/order/vo/order-id'
import { OrderStatus } from '~/domain/order/vo/order-status'
import { AccountId } from '~/domain/account/vo/account-id'
import { Address } from '~/domain/order/vo/address'
import { TimeWindow } from '~/domain/order/vo/time-window'
import { Weight } from '~/domain/order/vo/weight'
import { Assignment } from '~/domain/assignment/entity/assignment'

// モックの作成
const mockOrderRepository: IOrderRepository = {
  findById: vi.fn(),
  findByShipperId: vi.fn(),
  findByStatus: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
}

const mockAssignmentRepository: IAssignmentRepository = {
  findById: vi.fn(),
  findByOrderId: vi.fn(),
  findByCourierId: vi.fn(),
  findActiveByOrderId: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
}

describe('OfferAssignmentUseCase', () => {
  let useCase: OfferAssignmentUseCase

  beforeEach(() => {
    useCase = new OfferAssignmentUseCase(mockOrderRepository, mockAssignmentRepository)
    vi.clearAllMocks()
  })

  const createMockOrder = (status: string) => {
    return new Order({
      id: new OrderId('order-123'),
      shipperId: new AccountId('shipper-123'),
      status: new OrderStatus(status),
      pickupAddress: new Address('東京都渋谷区1-1-1'),
      dropoffAddress: new Address('東京都新宿区2-2-2'),
      pickupTimeWindow: new TimeWindow(null, null),
      dropoffTimeWindow: new TimeWindow(null, null),
      totalWeight: new Weight(5.0),
    })
  }

  describe('execute', () => {
    it('READY_TO_SHIP状態の注文に割り当てを作成できる', async () => {
      // Arrange
      const params = {
        orderId: 'order-123',
        courierId: 'courier-123',
      }

      const mockOrder = createMockOrder('READY_TO_SHIP')
      const mockAssignment = {} as Assignment

      vi.mocked(mockOrderRepository.findById).mockResolvedValue(mockOrder)
      vi.mocked(mockAssignmentRepository.findActiveByOrderId).mockResolvedValue(null)
      vi.mocked(mockAssignmentRepository.save).mockResolvedValue(mockAssignment)

      // Act
      const result = await useCase.execute(params)

      // Assert
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(expect.objectContaining({
        value: 'order-123'
      }))
      expect(mockAssignmentRepository.findActiveByOrderId).toHaveBeenCalledWith(mockOrder.id)
      expect(mockAssignmentRepository.save).toHaveBeenCalledOnce()
      expect(result).toBe(mockAssignment)
    })

    it('存在しない注文の場合はエラーが発生する', async () => {
      // Arrange
      const params = {
        orderId: 'non-existent-order',
        courierId: 'courier-123',
      }

      vi.mocked(mockOrderRepository.findById).mockResolvedValue(null)

      // Act & Assert
      await expect(useCase.execute(params)).rejects.toThrow('注文が見つかりません')
    })

    it('READY_TO_SHIP以外の状態の注文の場合はエラーが発生する', async () => {
      // Arrange
      const params = {
        orderId: 'order-123',
        courierId: 'courier-123',
      }

      const mockOrder = createMockOrder('PLACED')
      vi.mocked(mockOrderRepository.findById).mockResolvedValue(mockOrder)

      // Act & Assert
      await expect(useCase.execute(params)).rejects.toThrow(
        'この注文は割当できません。状態がREADY_TO_SHIPである必要があります'
      )
    })

    it('既にアクティブな割当がある場合はエラーが発生する', async () => {
      // Arrange
      const params = {
        orderId: 'order-123',
        courierId: 'courier-123',
      }

      const mockOrder = createMockOrder('READY_TO_SHIP')
      const mockExistingAssignment = {} as Assignment

      vi.mocked(mockOrderRepository.findById).mockResolvedValue(mockOrder)
      vi.mocked(mockAssignmentRepository.findActiveByOrderId).mockResolvedValue(mockExistingAssignment)

      // Act & Assert
      await expect(useCase.execute(params)).rejects.toThrow(
        'この注文には既にアクティブな割当があります'
      )
    })

    it('作成される割当の内容が正しい', async () => {
      // Arrange
      const params = {
        orderId: 'order-123',
        courierId: 'courier-456',
      }

      const mockOrder = createMockOrder('READY_TO_SHIP')
      const mockAssignment = {} as Assignment

      vi.mocked(mockOrderRepository.findById).mockResolvedValue(mockOrder)
      vi.mocked(mockAssignmentRepository.findActiveByOrderId).mockResolvedValue(null)
      vi.mocked(mockAssignmentRepository.save).mockResolvedValue(mockAssignment)

      // Act
      await useCase.execute(params)

      // Assert
      const assignmentCall = vi.mocked(mockAssignmentRepository.save).mock.calls[0][0]
      expect(assignmentCall).toBeInstanceOf(Assignment)
      expect(assignmentCall.orderId.value).toBe('order-123')
      expect(assignmentCall.courierId.value).toBe('courier-456')
      expect(assignmentCall.status.value).toBe('PENDING')
    })
  })
})