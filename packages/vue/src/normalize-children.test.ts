import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import type { Slots } from 'vue'
import { normalizeChildren } from './normalize-children'

describe('normalizeChildren', () => {
  it('returns [] when there is no default slot', () => {
    const slots: Slots = {}
    expect(normalizeChildren(slots)).toEqual([])
  })

  it('returns [] when the default slot returns an empty array', () => {
    const slots: Slots = { default: () => [] }
    expect(normalizeChildren(slots)).toEqual([])
  })

  it('returns a single VNode from the default slot', () => {
    const vnode = h('span')
    const slots: Slots = { default: () => [vnode] }
    const result = normalizeChildren(slots)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(vnode)
  })

  it('returns multiple VNodes from the default slot', () => {
    const a = h('span')
    const b = h('div')
    const slots: Slots = { default: () => [a, b] }
    const result = normalizeChildren(slots)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe(a)
    expect(result[1]).toBe(b)
  })

  it('filters out non-VNode items', () => {
    const vnode = h('span')
    const slots: Slots = {
      default: () => [vnode, null as unknown as ReturnType<typeof h>],
    }
    const result = normalizeChildren(slots)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(vnode)
  })

  it('ignores named slots other than default', () => {
    const vnode = h('span')
    const slots: Slots = {
      header: () => [h('h1')],
      default: () => [vnode],
    }
    const result = normalizeChildren(slots)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(vnode)
  })
})
