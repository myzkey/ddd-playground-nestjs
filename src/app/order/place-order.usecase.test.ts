import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PlaceOrderUseCase } from './place-order.usecase'
import { IOrderRepository } from '~/domain/order/order-repository.interface'
import { IDeliveryEventRepository } from '~/domain/delivery-event/delivery-event-repository.interface'
import { Order } from '~/domain/order/entity/order'
import { DeliveryEvent } from '~/domain/delivery-event/entity/delivery-event'

// モックの作成
const mockOrderRepository: IOrderRepository = {
  findById: vi.fn(),
  findByShipperId: vi.fn(),
  findByStatus: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
}

const mockDeliveryEventRepository: IDeliveryEventRepository = {
  findById: vi.fn(),
  findByOrderId: vi.fn(),
  findByType: vi.fn(),
  save: vi.fn(),
}

describe('PlaceOrderUseCase', () => {
  let useCase: PlaceOrderUseCase

  beforeEach(() => {
    useCase = new PlaceOrderUseCase(mockOrderRepository, mockDeliveryEventRepository)
    vi.clearAllMocks()
  })

  describe('execute', () => {
    it('注文を正常に作成できる', async () => {
      // Arrange
      const params = {
        shipperId: 'shipper-123',
        pickupAddress: '東京都渋谷区1-1-1',
        dropoffAddress: '東京都新宿区2-2-2',
        totalWeightKg: 5.0,
      }

      const mockSavedOrder = new Order({
        id: expect.any(Object),
        shipperId: expect.any(Object),
        status: expect.any(Object),
        pickupAddress: expect.any(Object),
        dropoffAddress: expect.any(Object),
        pickupTimeWindow: expect.any(Object),
        dropoffTimeWindow: expect.any(Object),
        totalWeight: expect.any(Object),
      })

      vi.mocked(mockOrderRepository.save).mockResolvedValue(mockSavedOrder)
      vi.mocked(mockDeliveryEventRepository.save).mockResolvedValue(expect.any(Object))

      // Act
      const result = await useCase.execute(params)

      // Assert
      expect(mockOrderRepository.save).toHaveBeenCalledOnce()
      expect(mockDeliveryEventRepository.save).toHaveBeenCalledOnce()
      expect(result).toBe(mockSavedOrder)

      // ドメインイベントが正しく作成されているかチェック
      const eventCall = vi.mocked(mockDeliveryEventRepository.save).mock.calls[0][0]
      expect(eventCall).toBeInstanceOf(DeliveryEvent)
      expect(eventCall.type.value).toBe('ORDER_PLACED')
    })

    it('必要な情報が設定される', async () => {
      // Arrange
      const params = {
        shipperId: 'shipper-123',
        pickupAddress: '東京都渋谷区1-1-1',
        dropoffAddress: '東京都新宿区2-2-2',
        pickupStartAt: new Date('2024-01-01T09:00:00Z'),
        pickupEndAt: new Date('2024-01-01T12:00:00Z'),
        totalWeightKg: 10.5,
        notes: '割れ物注意',
      }

      const mockSavedOrder = {} as Order
      vi.mocked(mockOrderRepository.save).mockResolvedValue(mockSavedOrder)
      vi.mocked(mockDeliveryEventRepository.save).mockResolvedValue(expect.any(Object))

      // Act
      await useCase.execute(params)

      // Assert
      const orderCall = vi.mocked(mockOrderRepository.save).mock.calls[0][0]
      expect(orderCall).toBeInstanceOf(Order)
      expect(orderCall.shipperId.value).toBe('shipper-123')
      expect(orderCall.status.value).toBe('PLACED')
      expect(orderCall.pickupAddress.value).toBe('東京都渋谷区1-1-1')
      expect(orderCall.dropoffAddress.value).toBe('東京都新宿区2-2-2')
      expect(orderCall.totalWeight.valueInKg).toBe(10.5)
      expect(orderCall.notes).toBe('割れ物注意')
    })
  })
})