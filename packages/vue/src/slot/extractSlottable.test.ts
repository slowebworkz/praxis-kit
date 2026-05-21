import { describe, it, expect } from 'vitest'
import { h, Fragment } from 'vue'
import type { VNode } from 'vue'
import { Slottable } from './Slottable'
import { extractSlottable } from './extractSlottable'

function makeSlottable(inner: VNode): VNode {
  return h(Slottable, null, { default: () => [inner] })
}

describe('extractSlottable — no Slottable present', () => {
  it('returns null for an empty children array', () => {
    expect(extractSlottable([])).toBeNull()
  })

  it('returns null when no child is a Slottable', () => {
    expect(extractSlottable([h('div'), h('span')])).toBeNull()
  })
})

describe('extractSlottable — single Slottable', () => {
  it('returns the inner child from a standalone Slottable', () => {
    const inner = h('a', { href: '/' })
    const result = extractSlottable([makeSlottable(inner)])
    expect(result).not.toBeNull()
    expect(result!.child).toBe(inner)
  })

  it('rebuild replaces the Slottable with the merged VNode in a Fragment', () => {
    const inner = h('a', { href: '/' })
    const icon = h('span', { 'aria-hidden': 'true' })
    const slottable = makeSlottable(inner)
    const merged = h('a', { href: '/', class: 'merged' })

    const result = extractSlottable([slottable, icon])!
    const fragment = result.rebuild(merged)

    expect(fragment.type).toBe(Fragment)
    const fragmentChildren = fragment.children as VNode[]
    expect(fragmentChildren[0]).toBe(merged)
    expect(fragmentChildren[1]).toBe(icon)
  })

  it('preserves sibling order when Slottable is not first', () => {
    const inner = h('a', { href: '/' })
    const before = h('span', { id: 'before' })
    const slottable = makeSlottable(inner)
    const merged = h('a', { class: 'merged' })

    const result = extractSlottable([before, slottable])!
    const fragment = result.rebuild(merged)
    const fragmentChildren = fragment.children as VNode[]

    expect(fragmentChildren[0]).toBe(before)
    expect(fragmentChildren[1]).toBe(merged)
  })
})

describe('extractSlottable — invariant violations', () => {
  it('throws when multiple Slottable children are present', () => {
    const children = [makeSlottable(h('a')), makeSlottable(h('span'))]
    expect(() => extractSlottable(children)).toThrow(
      'Slot: multiple Slottable children are not allowed',
    )
  })

  it('throws when Slottable has zero children', () => {
    const slottable = h(Slottable, null, { default: () => [] })
    expect(() => extractSlottable([slottable])).toThrow(
      'Slottable expects exactly one VNode child, received 0',
    )
  })

  it('throws when Slottable has more than one child', () => {
    const slottable = h(Slottable, null, { default: () => [h('a'), h('span')] })
    expect(() => extractSlottable([slottable])).toThrow(
      'Slottable expects exactly one VNode child, received 2',
    )
  })
})
