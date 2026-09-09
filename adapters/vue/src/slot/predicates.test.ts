import { describe, it, expect } from 'vitest'
import { Comment, Fragment, Text, createTextVNode, defineComponent, h } from 'vue'
import { isElementVNode, isTextVNode } from './predicates'

const Comp = defineComponent({ name: 'Comp', setup: () => () => h('div') })

describe('isElementVNode', () => {
  it('is true for an intrinsic element vnode', () => {
    expect(isElementVNode(h('div'))).toBe(true)
  })

  it('is true for a component vnode', () => {
    expect(isElementVNode(h(Comp))).toBe(true)
  })

  it('is false for a Text vnode', () => {
    expect(isElementVNode(createTextVNode('hi'))).toBe(false)
    expect(isElementVNode(h(Text, null, 'hi'))).toBe(false)
  })

  it('is false for a Comment vnode (what `v-if="false"` renders)', () => {
    expect(isElementVNode(h(Comment, null, ''))).toBe(false)
  })

  it('is false for a Fragment vnode', () => {
    expect(isElementVNode(h(Fragment, null, [h('a'), h('b')]))).toBe(false)
  })

  it('is false for non-vnodes', () => {
    expect(isElementVNode('text')).toBe(false)
    expect(isElementVNode(null)).toBe(false)
    expect(isElementVNode([h('a')])).toBe(false)
  })
})

describe('isTextVNode', () => {
  it('is true only for a Text vnode', () => {
    expect(isTextVNode(createTextVNode('x'))).toBe(true)
    expect(isTextVNode(h('span'))).toBe(false)
    expect(isTextVNode(h(Comment, null, ''))).toBe(false)
  })
})
