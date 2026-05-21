import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { Slottable } from './Slottable'

describe('Slottable', () => {
  it('renders its default slot children', () => {
    const wrapper = mount(Slottable, {
      slots: { default: () => [h('span', { id: 'child' }, 'hello')] },
    })
    expect(wrapper.find('span#child').exists()).toBe(true)
    expect(wrapper.text()).toBe('hello')
  })

  it('renders multiple slot children', () => {
    const wrapper = mount(Slottable, {
      slots: {
        default: () => [h('span', { id: 'a' }), h('span', { id: 'b' })],
      },
    })
    expect(wrapper.find('#a').exists()).toBe(true)
    expect(wrapper.find('#b').exists()).toBe(true)
  })

  it('renders nothing when the slot is empty', () => {
    const wrapper = mount(Slottable, {
      slots: { default: () => [] },
    })
    expect(wrapper.text()).toBe('')
  })

  it('has the displayName Slottable', () => {
    expect(Slottable.name).toBe('Slottable')
  })
})
