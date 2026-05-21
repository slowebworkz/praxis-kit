import { describe, it, expect, vi, afterEach } from 'vitest'
import { h } from 'vue'
import type { Slots, VNode } from 'vue'
import { AriaPolicyEngine } from '@polymorphic-ui/core'
import { render } from './render'
import { SlotValidator } from './slot/slot-validator'
import type { FilterPredicate, Runtime } from './types'

function makeRuntime(overrides?: Partial<Runtime>): Runtime {
  return {
    options: { variantKeys: new Set(), displayName: 'Test', strict: 'throw' },
    resolveTag: (as) => as ?? 'div',
    resolveProps: (props) => props,
    resolveClasses: (_tag, _props, className) => className ?? '',
    ...overrides,
  }
}

const emptySlots: Slots = {}
const noopFilter: FilterPredicate = () => false
const defaultValidator = new SlotValidator('Test', 'throw')
const defaultAriaEngine = new AriaPolicyEngine('throw')

function slotsWith(...vnodes: VNode[]): Slots {
  return { default: () => vnodes }
}

afterEach(() => vi.restoreAllMocks())

describe('render — tag resolution', () => {
  it('renders the default tag (div) when no as attr is given', () => {
    const vnode = render({
      runtime: makeRuntime(),
      attrs: {},
      slots: emptySlots,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(vnode?.type).toBe('div')
  })

  it('renders the tag specified by the as attr', () => {
    const vnode = render({
      runtime: makeRuntime(),
      attrs: { as: 'section' },
      slots: emptySlots,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(vnode?.type).toBe('section')
  })
})

describe('render — class resolution', () => {
  it('applies the resolved class to the element', () => {
    const runtime = makeRuntime({ resolveClasses: () => 'resolved-cls' })
    const vnode = render({
      runtime,
      attrs: {},
      slots: emptySlots,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(vnode?.props?.['class']).toBe('resolved-cls')
  })

  it('passes the caller class attr through to resolveClasses', () => {
    const resolveClasses = vi.fn(() => '')
    const runtime = makeRuntime({ resolveClasses })
    render({
      runtime,
      attrs: { class: 'caller-cls' },
      slots: emptySlots,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(resolveClasses).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'caller-cls',
      undefined,
    )
  })

  it('passes variantKey through to resolveClasses', () => {
    const resolveClasses = vi.fn(() => '')
    const runtime = makeRuntime({ resolveClasses })
    render({
      runtime,
      attrs: { variantKey: 'primary' },
      slots: emptySlots,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(resolveClasses).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      undefined,
      'primary',
    )
  })
})

describe('render — prop forwarding', () => {
  it('forwards extra attrs to the element', () => {
    const vnode = render({
      runtime: makeRuntime(),
      attrs: { 'data-testid': 'box' },
      slots: emptySlots,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(vnode?.props?.['data-testid']).toBe('box')
  })

  it('strips props where filterProps returns true', () => {
    const vnode = render({
      runtime: makeRuntime(),
      attrs: { size: 'lg', 'data-keep': 'yes' },
      slots: emptySlots,
      filterProps: (key) => key === 'size',
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(vnode?.props?.['size']).toBeUndefined()
    expect(vnode?.props?.['data-keep']).toBe('yes')
  })

  it('does not forward control attrs (as, asChild, variantKey) to the DOM element', () => {
    const vnode = render({
      runtime: makeRuntime(),
      attrs: { as: 'span', variantKey: 'k' },
      slots: emptySlots,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(vnode?.props?.['as']).toBeUndefined()
    expect(vnode?.props?.['asChild']).toBeUndefined()
    expect(vnode?.props?.['variantKey']).toBeUndefined()
  })

  it('does not include className on the output (Vue uses class)', () => {
    const runtime = makeRuntime({ resolveClasses: () => 'foo' })
    const vnode = render({
      runtime,
      attrs: {},
      slots: emptySlots,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(vnode?.props?.['className']).toBeUndefined()
    expect(vnode?.props?.['class']).toBe('foo')
  })
})

describe('render — asChild', () => {
  it('throws when as and asChild are both set', () => {
    expect(() =>
      render({
        runtime: makeRuntime(),
        attrs: { as: 'button', asChild: true },
        slots: slotsWith(h('button')),
        filterProps: noopFilter,
        slotValidator: defaultValidator,
        ariaEngine: defaultAriaEngine,
      }),
    ).toThrow('Test: "as" and "asChild" are mutually exclusive')
  })

  it('throws when asChild has zero children', () => {
    expect(() =>
      render({
        runtime: makeRuntime(),
        attrs: { asChild: true },
        slots: emptySlots,
        filterProps: noopFilter,
        slotValidator: defaultValidator,
        ariaEngine: defaultAriaEngine,
      }),
    ).toThrow('asChild requires exactly one VNode child, got 0')
  })

  it('throws when asChild has more than one child', () => {
    expect(() =>
      render({
        runtime: makeRuntime(),
        attrs: { asChild: true },
        slots: slotsWith(h('span'), h('span')),
        filterProps: noopFilter,
        slotValidator: defaultValidator,
        ariaEngine: defaultAriaEngine,
      }),
    ).toThrow('asChild requires exactly one VNode child, got 2')
  })

  it('returns the child element type when asChild has exactly one child', () => {
    const child = h('button', { type: 'submit' })
    const vnode = render({
      runtime: makeRuntime(),
      attrs: { asChild: true },
      slots: slotsWith(child),
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(vnode?.type).toBe('button')
  })

  it('merges the resolved class onto the asChild element', () => {
    const runtime = makeRuntime({ resolveClasses: () => 'merged-cls' })
    const child = h('button')
    const vnode = render({
      runtime,
      attrs: { asChild: true },
      slots: slotsWith(child),
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(vnode?.props?.['class']).toBe('merged-cls')
  })

  it('merges additional props onto the asChild element', () => {
    const child = h('button', { id: 'original' })
    const vnode = render({
      runtime: makeRuntime(),
      attrs: { asChild: true, 'data-extra': 'yes' },
      slots: slotsWith(child),
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(vnode?.props?.['data-extra']).toBe('yes')
    expect(vnode?.props?.['id']).toBe('original')
  })
})

describe('render — children', () => {
  it('passes the default slot through to the rendered element', () => {
    const child = h('span', { id: 'inner' })
    const vnode = render({
      runtime: makeRuntime(),
      attrs: {},
      slots: slotsWith(child),
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    // Children are forwarded as a slot object — the slot function exists on the VNode.
    expect(vnode?.children).toBeTruthy()
  })

  it('omits children when the default slot is empty', () => {
    const vnode = render({
      runtime: makeRuntime(),
      attrs: {},
      slots: emptySlots,
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
    })
    expect(vnode?.children).toBeFalsy()
  })
})

describe('render — childrenEvaluator', () => {
  it('calls childrenEvaluator.evaluate with the slot children', () => {
    const evaluate = vi.fn()
    const child = h('span')
    render({
      runtime: makeRuntime(),
      attrs: {},
      slots: slotsWith(child),
      filterProps: noopFilter,
      slotValidator: defaultValidator,
      ariaEngine: defaultAriaEngine,
      childrenEvaluator: { evaluate } as never,
    })
    expect(evaluate).toHaveBeenCalledWith([child])
  })

  it('does not throw when childrenEvaluator is absent', () => {
    expect(() =>
      render({
        runtime: makeRuntime(),
        attrs: {},
        slots: emptySlots,
        filterProps: noopFilter,
        slotValidator: defaultValidator,
        ariaEngine: defaultAriaEngine,
      }),
    ).not.toThrow()
  })
})
