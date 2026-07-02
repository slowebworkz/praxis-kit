import { describe, expect, it, vi } from 'vitest'
import type { CloneSlotChildFn } from './types'
import { makeRenderAsChild } from './make-render-as-child'
import { div, span } from '../test-utils'

const identity: CloneSlotChildFn = ({ child }) => child

describe('makeRenderAsChild — invalid child', () => {
  const renderAsChild = makeRenderAsChild(identity)

  it('throws on null', () => {
    expect(() => renderAsChild(null)).toThrow('asChild requires a React element child')
  })

  it('throws on a string', () => {
    expect(() => renderAsChild('text')).toThrow('asChild requires a React element child')
  })

  it('throws on a number', () => {
    expect(() => renderAsChild(42)).toThrow('asChild requires a React element child')
  })

  it('throws on a plain object', () => {
    expect(() => renderAsChild({ type: 'div' })).toThrow('asChild requires a React element child')
  })

  it('throws on false', () => {
    expect(() => renderAsChild(false)).toThrow('asChild requires a React element child')
  })

  it('throws on true', () => {
    expect(() => renderAsChild(true)).toThrow('asChild requires a React element child')
  })

  it('throws on an empty array', () => {
    expect(() => renderAsChild([])).toThrow('asChild requires a React element child')
  })

  it('throws on an array of elements — asChild requires exactly one element, not a fragment', () => {
    expect(() => renderAsChild([div()])).toThrow('asChild requires a React element child')
  })
})

describe('makeRenderAsChild — slotProps assembly', () => {
  it('passes empty slotProps when className is absent', () => {
    const cloneFn = vi.fn().mockImplementation(identity)
    makeRenderAsChild(cloneFn as unknown as CloneSlotChildFn)(div())
    expect(cloneFn).toHaveBeenCalledWith(expect.objectContaining({ slotProps: {} }))
  })

  it('passes empty slotProps when className is undefined', () => {
    const cloneFn = vi.fn().mockImplementation(identity)
    makeRenderAsChild(cloneFn as unknown as CloneSlotChildFn)(div(), undefined)
    expect(cloneFn).toHaveBeenCalledWith(expect.objectContaining({ slotProps: {} }))
  })

  it('passes { className } in slotProps when className is provided', () => {
    const cloneFn = vi.fn().mockImplementation(identity)
    makeRenderAsChild(cloneFn as unknown as CloneSlotChildFn)(div(), 'btn')
    expect(cloneFn).toHaveBeenCalledWith(
      expect.objectContaining({ slotProps: { className: 'btn' } }),
    )
  })
})

describe('makeRenderAsChild — ref forwarding', () => {
  it('passes ref as null when ref is undefined', () => {
    const cloneFn = vi.fn().mockImplementation(identity)
    makeRenderAsChild(cloneFn as unknown as CloneSlotChildFn)(div())
    expect(cloneFn).toHaveBeenCalledWith(expect.objectContaining({ ref: null }))
  })

  it('passes ref as null when ref is explicitly null', () => {
    const cloneFn = vi.fn().mockImplementation(identity)
    makeRenderAsChild(cloneFn as unknown as CloneSlotChildFn)(div(), undefined, null)
    expect(cloneFn).toHaveBeenCalledWith(expect.objectContaining({ ref: null }))
  })

  it('passes the ref through when provided', () => {
    const cloneFn = vi.fn().mockImplementation(identity)
    const ref = { current: null }
    makeRenderAsChild(cloneFn as unknown as CloneSlotChildFn)(div(), undefined, ref)
    expect(cloneFn).toHaveBeenCalledWith(expect.objectContaining({ ref }))
  })
})

describe('makeRenderAsChild — delegation', () => {
  it('passes the validated child element to cloneSlotChild', () => {
    const child = div({ id: 'target' })
    const cloneFn = vi.fn().mockImplementation(identity)
    makeRenderAsChild(cloneFn as unknown as CloneSlotChildFn)(child)
    expect(cloneFn).toHaveBeenCalledWith(expect.objectContaining({ child }))
  })

  it('returns whatever cloneSlotChild returns', () => {
    const replacement = span({ id: 'replaced' })
    const cloneFn: CloneSlotChildFn = () => replacement
    const result = makeRenderAsChild(cloneFn)(div())
    expect(result).toBe(replacement)
  })

  it('each factory call captures its own cloneSlotChild', () => {
    const cloneA = vi.fn().mockImplementation(identity)
    const cloneB = vi.fn().mockImplementation(identity)
    const renderA = makeRenderAsChild(cloneA as unknown as CloneSlotChildFn)
    const renderB = makeRenderAsChild(cloneB as unknown as CloneSlotChildFn)

    renderA(div())
    expect(cloneA).toHaveBeenCalledTimes(1)
    expect(cloneB).not.toHaveBeenCalled()

    renderB(div())
    expect(cloneB).toHaveBeenCalledTimes(1)
    expect(cloneA).toHaveBeenCalledTimes(1)
  })
})
