import { describe, it, expect, vi, afterEach } from 'vitest'
import { h, Fragment } from 'vue'
import type { Slots, VNode } from 'vue'
import { render } from './render'
import { SlotValidator } from './slot/slot-validator'
import { Slottable } from './slot/Slottable'
import type { FilterPredicate, Runtime } from './types'

function makeRuntime(overrides?: Partial<Runtime>): Runtime {
  return {
    options: { variantKeys: new Set(), displayName: 'Test', strict: 'throw' },
    resolveTag: (as) => as ?? 'div',
    resolveProps: (props) => props,
    resolveClasses: (_tag, _props, className) => className ?? '',
    resolveAria: (_tag, props) => ({ props }),
    ...overrides,
  }
}

const emptySlots: Slots = {}
const noopFilter: FilterPredicate = () => false
const defaultValidator = new SlotValidator('Test', 'throw')

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
      }),
    ).toThrow('asChild requires a VNode child')
  })

  it('throws when asChild has more than one child', () => {
    expect(() =>
      render({
        runtime: makeRuntime(),
        attrs: { asChild: true },
        slots: slotsWith(h('span'), h('span')),
        filterProps: noopFilter,
        slotValidator: defaultValidator,
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
    })
    expect(vnode?.props?.['data-extra']).toBe('yes')
    expect(vnode?.props?.['id']).toBe('original')
  })

  it("concatenates resolved class with the child's existing class", () => {
    const runtime = makeRuntime({ resolveClasses: () => 'slot-cls' })
    const child = h('button', { class: 'child-cls' })
    const vnode = render({
      runtime,
      attrs: { asChild: true },
      slots: slotsWith(child),
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    const cls = vnode?.props?.['class'] as unknown
    expect(String(cls)).toContain('slot-cls')
    expect(String(cls)).toContain('child-cls')
  })

  it('stacks onX handlers from slot attrs and child', () => {
    const slotHandler = vi.fn()
    const childHandler = vi.fn()
    const child = h('button', { onClick: childHandler })
    const vnode = render({
      runtime: makeRuntime(),
      attrs: { asChild: true, onClick: slotHandler },
      slots: slotsWith(child),
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    const handler = vnode?.props?.['onClick']
    expect(Array.isArray(handler)).toBe(true)
    ;(handler as (() => void)[]).forEach((fn) => fn())
    expect(childHandler).toHaveBeenCalled()
    expect(slotHandler).toHaveBeenCalled()
  })

  it('shallow-merges style objects from slot attrs and child', () => {
    const child = h('button', { style: { color: 'red' } })
    const vnode = render({
      runtime: makeRuntime(),
      attrs: { asChild: true, style: { margin: '4px' } },
      slots: slotsWith(child),
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })
    expect(vnode?.props?.['style']).toMatchObject({ color: 'red', margin: '4px' })
  })

  it('falls back to normal render when strict is warn and asChild has multiple non-Slottable children', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const vnode = render({
      runtime: makeRuntime({
        options: { variantKeys: new Set(), displayName: 'Box', strict: 'warn' },
      }),
      attrs: { asChild: true },
      slots: slotsWith(h('span'), h('div')),
      filterProps: noopFilter,
      slotValidator: new SlotValidator('Box', 'warn'),
    })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('asChild requires exactly one'))
    expect(vnode?.type).toBe('div')
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
      }),
    ).not.toThrow()
  })
})

describe('render — asChild Slottable sibling pattern', () => {
  it('wraps result in a Fragment when a Slottable sibling is present', () => {
    const inner = h('a', { href: '/' })
    const slottable = h(Slottable, null, { default: () => [inner] })
    const sibling = h('span', { 'aria-hidden': 'true' })

    const vnode = render({
      runtime: makeRuntime(),
      attrs: { asChild: true },
      slots: slotsWith(slottable, sibling),
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })

    expect(vnode?.type).toBe(Fragment)
  })

  it("merges slot props onto the Slottable's inner child", () => {
    const inner = h('a', { href: '/' })
    const slottable = h(Slottable, null, { default: () => [inner] })

    const vnode = render({
      runtime: makeRuntime({ resolveClasses: () => 'slot-cls' }),
      attrs: { asChild: true, 'data-extra': 'yes' },
      slots: slotsWith(slottable),
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })

    const fragmentChildren = vnode?.children as VNode[]
    const mergedEl = fragmentChildren[0]!
    expect(mergedEl.type).toBe('a')
    expect(mergedEl.props?.['data-extra']).toBe('yes')
  })

  it('preserves siblings alongside the merged inner child', () => {
    const inner = h('a', { href: '/' })
    const slottable = h(Slottable, null, { default: () => [inner] })
    const sibling = h('span', { id: 'sibling' })

    const vnode = render({
      runtime: makeRuntime(),
      attrs: { asChild: true },
      slots: slotsWith(slottable, sibling),
      filterProps: noopFilter,
      slotValidator: defaultValidator,
    })

    const fragmentChildren = vnode?.children as VNode[]
    expect(fragmentChildren).toHaveLength(2)
    expect((fragmentChildren[1] as VNode).props?.id).toBe('sibling')
  })
})

describe('render — discarded children warning', () => {
  it('warns when asChild receives a mixed array containing non-VNode children', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const child = h('button')
    const validator = new SlotValidator('Test', 'warn')
    // Slot returns one real VNode and one null (non-VNode) — normalizeChildren drops the null
    const mixedSlots: Slots = {
      default: () => [child, null as unknown as ReturnType<typeof h>],
    }

    render({
      runtime: makeRuntime({
        options: { variantKeys: new Set(), displayName: 'Test', strict: 'warn' },
      }),
      attrs: { asChild: true },
      slots: mixedSlots,
      filterProps: noopFilter,
      slotValidator: validator,
    })

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('discarded 1 non-element child'))
  })

  it('does not warn about discarded children when strict is false', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const child = h('button')
    const validator = new SlotValidator('Test', false)
    const mixedSlots: Slots = {
      default: () => [child, null as unknown as ReturnType<typeof h>],
    }

    render({
      runtime: makeRuntime({
        options: { variantKeys: new Set(), displayName: 'Test', strict: false },
      }),
      attrs: { asChild: true },
      slots: mixedSlots,
      filterProps: noopFilter,
      slotValidator: validator,
    })

    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('does not warn about discarded children on the normal render path', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const validator = new SlotValidator('Test', 'warn')
    const mixedSlots: Slots = {
      default: () => [h('span'), null as unknown as ReturnType<typeof h>],
    }

    render({
      runtime: makeRuntime({
        options: { variantKeys: new Set(), displayName: 'Test', strict: 'warn' },
      }),
      attrs: {},
      slots: mixedSlots,
      filterProps: noopFilter,
      slotValidator: validator,
    })

    expect(warnSpy).not.toHaveBeenCalled()
  })
})
