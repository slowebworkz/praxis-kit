import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import type { Slots } from 'vue'
import { normalizeChildren } from './normalize-children'

describe('normalizeChildren', () => {
  it('returns empty vnodes and zero discarded when there is no default slot', () => {
    const slots: Slots = {}
    const result = normalizeChildren(slots)
    expect(result.vnodes).toEqual([])
    expect(result.discarded).toBe(0)
  })

  it('returns empty vnodes and zero discarded when the default slot returns an empty array', () => {
    const slots: Slots = { default: () => [] }
    const result = normalizeChildren(slots)
    expect(result.vnodes).toEqual([])
    expect(result.discarded).toBe(0)
  })

  it('returns a single VNode from the default slot', () => {
    const vnode = h('span')
    const slots: Slots = { default: () => [vnode] }
    const result = normalizeChildren(slots)
    expect(result.vnodes).toHaveLength(1)
    expect(result.vnodes[0]).toBe(vnode)
    expect(result.discarded).toBe(0)
  })

  it('returns multiple VNodes from the default slot', () => {
    const a = h('span')
    const b = h('div')
    const slots: Slots = { default: () => [a, b] }
    const result = normalizeChildren(slots)
    expect(result.vnodes).toHaveLength(2)
    expect(result.vnodes[0]).toBe(a)
    expect(result.vnodes[1]).toBe(b)
    expect(result.discarded).toBe(0)
  })

  it('filters out non-VNode items and reports them as discarded', () => {
    const vnode = h('span')
    const slots: Slots = {
      default: () => [vnode, null as unknown as ReturnType<typeof h>],
    }
    const result = normalizeChildren(slots)
    expect(result.vnodes).toHaveLength(1)
    expect(result.vnodes[0]).toBe(vnode)
    expect(result.discarded).toBe(1)
  })

  it('ignores named slots other than default', () => {
    const vnode = h('span')
    const slots: Slots = {
      header: () => [h('h1')],
      default: () => [vnode],
    }
    const result = normalizeChildren(slots)
    expect(result.vnodes).toHaveLength(1)
    expect(result.vnodes[0]).toBe(vnode)
    expect(result.discarded).toBe(0)
  })
})
