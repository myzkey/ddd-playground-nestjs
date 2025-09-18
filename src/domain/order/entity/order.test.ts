import { describe, it, expect } from 'vitest'
import { Order } from './order'
import { OrderId } from '../vo/order-id'
import { OrderStatus, OrderStatusType } from '../vo/order-status'
import { AccountId } from '../../account/vo/account-id'
import { Address } from '../vo/address'
import { TimeWindow } from '../vo/time-window'
import { Weight } from '../vo/weight'

describe('Order', () => {
  const createTestOrder = (status: string = 'PLACED') => {
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

  describe('markReadyToShip', () => {
    it('PLACED状態から出荷準備完了にできる', () => {
      const order = createTestOrder('PLACED')
      order.markReadyToShip()
      expect(order.status.value).toBe(OrderStatusType.READY_TO_SHIP)
    })

    it('PLACED以外の状態ではエラーが発生する', () => {
      const order = createTestOrder('ASSIGNED')
      expect(() => order.markReadyToShip()).toThrow(
        'PLACED状態の注文のみ出荷準備完了にできます'
      )
    })
  })

  describe('assign', () => {
    it('READY_TO_SHIP状態から割り当て状態にできる', () => {
      const order = createTestOrder('READY_TO_SHIP')
      order.assign()
      expect(order.status.value).toBe(OrderStatusType.ASSIGNED)
    })

    it('READY_TO_SHIP以外の状態ではエラーが発生する', () => {
      const order = createTestOrder('PLACED')
      expect(() => order.assign()).toThrow(
        'READY_TO_SHIP状態の注文のみ割り当て可能です'
      )
    })
  })

  describe('deliver', () => {
    it('ASSIGNED状態から配達完了状態にできる', () => {
      const order = createTestOrder('ASSIGNED')
      order.deliver()
      expect(order.status.value).toBe(OrderStatusType.DELIVERED)
    })

    it('ASSIGNED以外の状態ではエラーが発生する', () => {
      const order = createTestOrder('PLACED')
      expect(() => order.deliver()).toThrow(
        'ASSIGNED状態の注文のみ配達完了にできます'
      )
    })
  })

  describe('cancel', () => {
    it('PLACED状態からキャンセルできる', () => {
      const order = createTestOrder('PLACED')
      order.cancel()
      expect(order.status.value).toBe(OrderStatusType.CANCELLED)
    })

    it('DELIVERED状態ではキャンセルできない', () => {
      const order = createTestOrder('DELIVERED')
      expect(() => order.cancel()).toThrow(
        '配達済みの注文はキャンセルできません'
      )
    })
  })

  describe('canBeAssigned', () => {
    it('READY_TO_SHIP状態では割り当て可能', () => {
      const order = createTestOrder('READY_TO_SHIP')
      expect(order.canBeAssigned()).toBe(true)
    })

    it('PLACED状態では割り当て不可', () => {
      const order = createTestOrder('PLACED')
      expect(order.canBeAssigned()).toBe(false)
    })
  })
})