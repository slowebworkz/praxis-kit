import { describe, it, expect, vi } from 'vitest'
import { mergeProps } from './mergeProps'

describe('mergeProps', () => {
  it('preserves slot-only props when child has none', () => {
    expect(mergeProps({ id: 'slot' }, {})).toEqual({ id: 'slot' })
  })

  it('adds child-only props to the result', () => {
    expect(mergeProps({}, { 'data-x': '1' })).toEqual({ 'data-x': '1' })
  })

  it('child wins on plain prop conflict', () => {
    expect(mergeProps({ title: 'slot' }, { title: 'child' })).toEqual({ title: 'child' })
  })

  it('concatenates className: slot first, then child', () => {
    const result = mergeProps({ className: 'a' }, { className: 'b' })
    expect(result['className']).toBe('a b')
  })

  it('uses child className alone when slot has none', () => {
    expect(mergeProps({}, { className: 'b' })).toEqual({ className: 'b' })
  })

  it('chains event handlers: child fires first', () => {
    const order: string[] = []
    const slotClick = () => order.push('slot')
    const childClick = () => order.push('child')
    const result = mergeProps({ onClick: slotClick }, { onClick: childClick })
    ;(result['onClick'] as () => void)()
    expect(order).toEqual(['child', 'slot'])
  })

  it('forwards handler arguments through the chain', () => {
    const slot = vi.fn()
    const child = vi.fn()
    const result = mergeProps({ onFocus: slot }, { onFocus: child })
    ;(result['onFocus'] as (e: string) => void)('event')
    expect(child).toHaveBeenCalledWith('event')
    expect(slot).toHaveBeenCalledWith('event')
  })

  it('keeps slot handler when child has no matching handler', () => {
    const slotClick = vi.fn()
    const result = mergeProps({ onClick: slotClick }, { id: 'child' })
    expect(result['onClick']).toBe(slotClick)
  })

  it('merges style: child wins on key conflict', () => {
    const result = mergeProps(
      { style: { color: 'red', margin: '0' } },
      { style: { color: 'blue' } },
    )
    expect(result['style']).toEqual({ color: 'blue', margin: '0' })
  })

  it('does not apply style merge when slot has no style', () => {
    const childStyle = { color: 'blue' }
    const result = mergeProps({}, { style: childStyle })
    expect(result['style']).toBe(childStyle)
  })

  it('does not mutate either input', () => {
    const slot = { className: 'a', onClick: () => {} }
    const child = { className: 'b' }
    mergeProps(slot, child)
    expect(slot.className).toBe('a')
    expect(child.className).toBe('b')
  })
})
