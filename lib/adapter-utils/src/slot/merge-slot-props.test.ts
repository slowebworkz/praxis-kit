import { describe, expect, it, vi } from 'vitest'
import { mergeSlotProps } from './merge-slot-props'

describe('mergeSlotProps — event handlers', () => {
  it('chains two distinct handlers, child first', () => {
    const order: string[] = []
    const merged = mergeSlotProps(
      { onClick: () => order.push('slot') },
      { onClick: () => order.push('child') },
    )

    ;(merged['onClick'] as () => void)()

    expect(order).toEqual(['child', 'slot'])
  })

  it('does not chain the same handler reference with itself', () => {
    const handler = vi.fn()
    const merged = mergeSlotProps({ onClick: handler }, { onClick: handler })

    ;(merged['onClick'] as () => void)()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('still chains equivalent but distinct functions', () => {
    const a = vi.fn()
    const b = vi.fn()
    const merged = mergeSlotProps({ onClick: a }, { onClick: b })

    ;(merged['onClick'] as () => void)()

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })
})
