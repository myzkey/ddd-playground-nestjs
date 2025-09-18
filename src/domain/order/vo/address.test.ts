import { describe, it, expect } from 'vitest'
import { Address } from './address'

describe('Address', () => {
  describe('constructor', () => {
    it('有効な住所で作成できる', () => {
      const address = new Address('東京都渋谷区1-1-1')
      expect(address.value).toBe('東京都渋谷区1-1-1')
    })

    it('前後の空白を除去する', () => {
      const address = new Address('  東京都渋谷区1-1-1  ')
      expect(address.value).toBe('東京都渋谷区1-1-1')
    })

    it('空文字でエラーが発生する', () => {
      expect(() => new Address('')).toThrow('住所は必須です')
    })

    it('空白のみでエラーが発生する', () => {
      expect(() => new Address('   ')).toThrow('住所は必須です')
    })
  })

  describe('equals', () => {
    it('同じ住所の場合はtrueを返す', () => {
      const address1 = new Address('東京都渋谷区1-1-1')
      const address2 = new Address('東京都渋谷区1-1-1')
      expect(address1.equals(address2)).toBe(true)
    })

    it('異なる住所の場合はfalseを返す', () => {
      const address1 = new Address('東京都渋谷区1-1-1')
      const address2 = new Address('東京都新宿区2-2-2')
      expect(address1.equals(address2)).toBe(false)
    })
  })
})