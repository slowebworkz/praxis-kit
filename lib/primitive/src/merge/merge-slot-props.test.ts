import { describe, it, expect, vi } from 'vitest'
import { mergeSlotProps } from './merge-slot-props'

describe('mergeSlotProps', () => {
  it('preserves slot-only props when child has none', () => {
    expect(mergeSlotProps({ id: 'slot' }, {})).toEqual({ id: 'slot' })
  })

  it('adds child-only props to the result', () => {
    expect(mergeSlotProps({}, { 'data-x': '1' })).toEqual({ 'data-x': '1' })
  })

  it('child wins on plain prop conflict', () => {
    expect(mergeSlotProps({ title: 'slot' }, { title: 'child' })).toEqual({ title: 'child' })
  })

  it('concatenates className: slot first, then child', () => {
    const result = mergeSlotProps({ className: 'a' }, { className: 'b' })
    expect(result['className']).toBe('a b')
  })

  it('uses child className alone when slot has none', () => {
    expect(mergeSlotProps({}, { className: 'b' })).toEqual({ className: 'b' })
  })

  it('chains event handlers: child fires first', () => {
    const order: string[] = []
    const slotClick = () => order.push('slot')
    const childClick = () => order.push('child')
    const result = mergeSlotProps({ onClick: slotClick }, { onClick: childClick })
    ;(result['onClick'] as () => void)()
    expect(order).toEqual(['child', 'slot'])
  })

  it('forwards handler arguments through the chain', () => {
    const slot = vi.fn()
    const child = vi.fn()
    const result = mergeSlotProps({ onFocus: slot }, { onFocus: child })
    ;(result['onFocus'] as (e: string) => void)('event')
    expect(child).toHaveBeenCalledWith('event')
    expect(slot).toHaveBeenCalledWith('event')
  })

  it('keeps slot handler when child has no matching handler', () => {
    const slotClick = vi.fn()
    const result = mergeSlotProps({ onClick: slotClick }, { id: 'child' })
    expect(result['onClick']).toBe(slotClick)
  })

  it('child wins when event key is present but child value is not a function', () => {
    const slotClick = vi.fn()
    const result = mergeSlotProps({ onClick: slotClick }, { onClick: null })
    expect(result['onClick']).toBeNull()
  })

  it('child wins when event key is present but slot value is not a function', () => {
    const childClick = vi.fn()
    const result = mergeSlotProps({ onClick: null }, { onClick: childClick })
    expect(result['onClick']).toBe(childClick)
  })

  it('merges style: child wins on key conflict', () => {
    const result = mergeSlotProps(
      { style: { color: 'red', margin: '0' } },
      { style: { color: 'blue' } },
    )
    expect(result['style']).toEqual({ color: 'blue', margin: '0' })
  })

  it('does not apply style merge when slot has no style', () => {
    const childStyle = { color: 'blue' }
    const result = mergeSlotProps({}, { style: childStyle })
    expect(result['style']).toBe(childStyle)
  })

  it('does not apply style merge when child style is not a plain object', () => {
    const result = mergeSlotProps({ style: { color: 'red' } }, { style: 'invalid' as never })
    expect(result['style']).toBe('invalid')
  })

  it('does not mutate either input', () => {
    const slot = { className: 'a', onClick: () => {} }
    const child = { className: 'b' }
    mergeSlotProps(slot, child)
    expect(slot.className).toBe('a')
    expect(child.className).toBe('b')
  })
})
