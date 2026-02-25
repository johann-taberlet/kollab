import { describe, it, expect } from 'vitest'
import { getPositionBetween, needsRebalance, rebalancePositions } from '../position'

describe('getPositionBetween', () => {
  it('returns gap when both null', () => {
    expect(getPositionBetween(null, null)).toBe(1000)
  })
  it('returns midpoint between two positions', () => {
    expect(getPositionBetween(1000, 3000)).toBe(2000)
  })
  it('appends after last item', () => {
    expect(getPositionBetween(5000, null)).toBe(6000)
  })
  it('prepends before first item', () => {
    expect(getPositionBetween(null, 1000)).toBe(0)
  })
})

describe('needsRebalance', () => {
  it('returns false when gaps are large', () => {
    expect(needsRebalance([1000, 2000, 3000])).toBe(false)
  })
  it('returns true when gap is zero', () => {
    expect(needsRebalance([1000, 1000, 2000])).toBe(true)
  })
})

describe('rebalancePositions', () => {
  it('returns evenly spaced positions', () => {
    expect(rebalancePositions(3)).toEqual([1000, 2000, 3000])
  })
})
