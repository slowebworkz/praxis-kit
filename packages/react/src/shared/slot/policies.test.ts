import { describe, it, expect, vi } from 'vitest'
import { chainHandlers, mergeClassNames, mergeStyles } from './policies'

describe('chainHandlers', () => {
  it('calls child handler first, then slot handler', () => {
    const order: string[] = []
    const child = () => order.push('child')
    const slot = () => order.push('slot')
    chainHandlers(child, slot)()
    expect(order).toEqual(['child', 'slot'])
  })

  it('forwards arguments to both handlers', () => {
    const child = vi.fn()
    const slot = vi.fn()
    chainHandlers(child, slot)('arg1', 'arg2')
    expect(child).toHaveBeenCalledWith('arg1', 'arg2')
    expect(slot).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('slot still fires even if child throws', () => {
    const slot = vi.fn()
    const composed = chainHandlers(() => {
      throw new Error('child error')
    }, slot)
    expect(() => composed()).toThrow('child error')
    expect(slot).not.toHaveBeenCalled()
  })
})

describe('mergeClassNames', () => {
  it('returns slot and child joined by a space', () =>
    expect(mergeClassNames('slot-cls', 'child-cls')).toBe('slot-cls child-cls'))

  it('returns child alone when slot is empty string', () =>
    expect(mergeClassNames('', 'child-cls')).toBe('child-cls'))

  it('returns slot alone when child is empty string', () =>
    expect(mergeClassNames('slot-cls', '')).toBe('slot-cls'))

  it('returns empty string when both are empty', () => expect(mergeClassNames('', '')).toBe(''))

  it('ignores undefined slot', () =>
    expect(mergeClassNames(undefined, 'child-cls')).toBe('child-cls'))

  it('ignores undefined child', () =>
    expect(mergeClassNames('slot-cls', undefined)).toBe('slot-cls'))
})

describe('mergeStyles', () => {
  it('merges slot and child style objects', () =>
    expect(mergeStyles({ color: 'red' }, { fontWeight: 'bold' })).toEqual({
      color: 'red',
      fontWeight: 'bold',
    }))

  it('child wins on key conflict', () =>
    expect(mergeStyles({ color: 'red' }, { color: 'blue' })).toEqual({ color: 'blue' }))

  it('preserves slot-only keys when child is empty', () =>
    expect(mergeStyles({ color: 'red' }, {})).toEqual({ color: 'red' }))

  it('handles empty slot object', () =>
    expect(mergeStyles({}, { color: 'blue' })).toEqual({ color: 'blue' }))
})
