import { describe, it, expect, vi } from 'vitest'
import { createElement, isValidElement } from 'react'
import type { ReactElement } from 'react'
import { render } from './render'
import type { AnyRuntime } from './types'

function makeRuntime(overrides?: Partial<AnyRuntime>): AnyRuntime {
  return {
    options: { variantKeys: new Set(), displayName: 'Test' },
    resolveTag: (as) => as ?? 'div',
    resolveProps: (props) => props,
    resolveClasses: (_tag, _props, className) => className ?? '',
    ...overrides,
  }
}

const noopNormalize = (children: unknown): ReactElement[] =>
  isValidElement(children) ? [children as ReactElement] : []

const slotComponent = ({ children }: { children?: unknown }) =>
  createElement('div', { 'data-slot': true }, children as ReactElement)

describe('render', () => {
  it('renders the default tag when no as prop is given', () => {
    const el = render({
      runtime: makeRuntime(),
      props: {},
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
    })
    expect(el.type).toBe('div')
  })

  it('renders the tag specified by the as prop', () => {
    const el = render({
      runtime: makeRuntime(),
      props: { as: 'button' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
    })
    expect(el.type).toBe('button')
  })

  it('passes className to the element', () => {
    const runtime = makeRuntime({
      resolveClasses: () => 'resolved-class',
    })
    const el = render({
      runtime,
      props: { className: 'caller-class' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
    })
    expect((el.props as { className: string }).className).toBe('resolved-class')
  })

  it('forwards the ref to the element', () => {
    const ref = { current: null }
    const el = render({
      runtime: makeRuntime(),
      props: {},
      ref,
      slotComponent,
      normalizeChildren: noopNormalize,
    })
    expect((el.props as { ref: unknown }).ref).toBe(ref)
  })

  it('passes dom-safe extra props to the element', () => {
    const el = render({
      runtime: makeRuntime(),
      props: { 'data-testid': 'box' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
    })
    expect((el.props as Record<string, unknown>)['data-testid']).toBe('box')
  })

  it('omits children from props when not provided', () => {
    const el = render({
      runtime: makeRuntime(),
      props: {},
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
    })
    expect('children' in (el.props as object)).toBe(false)
  })

  it('passes children when provided', () => {
    const child = createElement('span')
    const el = render({
      runtime: makeRuntime(),
      props: { children: child },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
    })
    expect((el.props as { children: unknown }).children).toBe(child)
  })

  it('strips props that filterProps returns true for', () => {
    const el = render({
      runtime: makeRuntime(),
      props: { size: 'lg', 'data-keep': 'yes' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
      filterProps: (key) => key === 'size',
    })
    const props = el.props as Record<string, unknown>
    expect(props['size']).toBeUndefined()
    expect(props['data-keep']).toBe('yes')
  })

  it('throws when as and asChild are both set', () => {
    expect(() =>
      render({
        runtime: makeRuntime(),
        props: { as: 'button', asChild: true },
        ref: null,
        slotComponent,
        normalizeChildren: noopNormalize,
      }),
    ).toThrow('Test: "as" and "asChild" are mutually exclusive')
  })

  it('throws when asChild has zero children', () => {
    expect(() =>
      render({
        runtime: makeRuntime(),
        props: { asChild: true, children: null },
        ref: null,
        slotComponent,
        normalizeChildren: () => [],
      }),
    ).toThrow('asChild requires exactly one React element child, got 0')
  })

  it('throws when asChild has more than one child', () => {
    const kids = [createElement('span'), createElement('span')]
    expect(() =>
      render({
        runtime: makeRuntime(),
        props: { asChild: true, children: kids },
        ref: null,
        slotComponent,
        normalizeChildren: () => kids,
      }),
    ).toThrow('asChild requires exactly one React element child, got 2')
  })

  it('asChild path renders the slotComponent wrapping the child', () => {
    const child = createElement('button', { type: 'submit' })
    const el = render({
      runtime: makeRuntime(),
      props: { asChild: true, children: child },
      ref: null,
      slotComponent,
      normalizeChildren: () => [child],
    })
    expect(el.type).toBe(slotComponent)
    expect((el.props as { children: unknown }).children).toBe(child)
  })

  it('asChild path forwards className via slot props', () => {
    const runtime = makeRuntime({ resolveClasses: () => 'slot-class' })
    const child = createElement('button')
    const el = render({
      runtime,
      props: { asChild: true, children: child },
      ref: null,
      slotComponent,
      normalizeChildren: () => [child],
    })
    expect((el.props as { className: string }).className).toBe('slot-class')
  })

  it('variantKey is forwarded to resolveClasses', () => {
    const resolveClasses = vi.fn(() => 'variant-class')
    const runtime = makeRuntime({ resolveClasses })
    render({
      runtime,
      props: { variantKey: 'primary' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
    })
    expect(resolveClasses).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      undefined,
      'primary',
    )
  })

  it('control props (as, asChild, className, variantKey, children) are not forwarded to the DOM', () => {
    const el = render({
      runtime: makeRuntime(),
      props: { as: 'span', className: 'x', variantKey: 'k', children: 'text' },
      ref: null,
      slotComponent,
      normalizeChildren: noopNormalize,
    })
    const props = el.props as Record<string, unknown>
    expect(props['as']).toBeUndefined()
    expect(props['asChild']).toBeUndefined()
    expect(props['variantKey']).toBeUndefined()
  })
})
