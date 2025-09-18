import { describe, it, expect } from 'vitest'
import { OrderStatus, OrderStatusType } from './order-status'

describe('OrderStatus', () => {
  describe('constructor', () => {
    it('有効なステータスで作成できる', () => {
      const status = new OrderStatus('PLACED')
      expect(status.value).toBe(OrderStatusType.PLACED)
    })

    it('無効なステータスでエラーが発生する', () => {
      expect(() => new OrderStatus('INVALID')).toThrow('無効な注文ステータスです: INVALID')
    })
  })

  describe('canBeAssigned', () => {
    it('READY_TO_SHIPの場合はtrueを返す', () => {
      const status = new OrderStatus('READY_TO_SHIP')
      expect(status.canBeAssigned()).toBe(true)
    })

    it('PLACED状態の場合はfalseを返す', () => {
      const status = new OrderStatus('PLACED')
      expect(status.canBeAssigned()).toBe(false)
    })

    it('ASSIGNED状態の場合はfalseを返す', () => {
      const status = new OrderStatus('ASSIGNED')
      expect(status.canBeAssigned()).toBe(false)
    })
  })

  describe('equals', () => {
    it('同じステータスの場合はtrueを返す', () => {
      const status1 = new OrderStatus('PLACED')
      const status2 = new OrderStatus('PLACED')
      expect(status1.equals(status2)).toBe(true)
    })

    it('異なるステータスの場合はfalseを返す', () => {
      const status1 = new OrderStatus('PLACED')
      const status2 = new OrderStatus('READY_TO_SHIP')
      expect(status1.equals(status2)).toBe(false)
    })
  })
})