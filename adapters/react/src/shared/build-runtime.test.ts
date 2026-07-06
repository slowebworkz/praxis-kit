import { describe, expect, it } from 'vitest'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { buildRuntime } from './build-runtime'
import { SlotValidator } from './slot'

// `buildRuntime` contains the shared runtime construction used by both the current and legacy
// React adapters. Those adapters differ only in their Slot implementation and child normalization
// strategy; the runtime assembly itself is identical.
//
// These tests verify that shared assembly directly rather than relying on indirect coverage
// through component rendering.

function DefaultSlot() {
  return null
}
function OtherSlot() {
  return null
}
const normalizeChildren = (children: unknown) => (Array.isArray(children) ? children : [])

describe('buildRuntime()', () => {
  it('constructs a working PolymorphicRuntime', () => {
    const bundle = buildRuntime({ tag: 'div' }, DefaultSlot, normalizeChildren)
    expect(bundle.runtime.resolveTag()).toBe('div')
    expect(typeof bundle.runtime.resolveClasses).toBe('function')
  })

  it('defaults slotComponent to the provided default when options.slotComponent is unset', () => {
    const bundle = buildRuntime({ tag: 'div' }, DefaultSlot, normalizeChildren)
    expect(bundle.slotComponent).toBe(DefaultSlot)
  })

  it("uses the caller's slotComponent when explicitly provided", () => {
    const bundle = buildRuntime(
      { tag: 'div', slotComponent: OtherSlot },
      DefaultSlot,
      normalizeChildren,
    )
    expect(bundle.slotComponent).toBe(OtherSlot)
  })

  it('uses the provided normalizeChildren implementation', () => {
    const bundle = buildRuntime({ tag: 'div' }, DefaultSlot, normalizeChildren)
    expect(bundle.normalizeChildren).toBe(normalizeChildren)
  })

  it('creates a SlotValidator for React elements', () => {
    const bundle = buildRuntime({ tag: 'div' }, DefaultSlot, normalizeChildren)
    expect(bundle.slotValidator).toBeInstanceOf(SlotValidator)
  })

  it('omits childrenEvaluator when enforcement.children is not configured', () => {
    const bundle = buildRuntime({ tag: 'div' }, DefaultSlot, normalizeChildren)
    expect('childrenEvaluator' in bundle).toBe(false)
  })

  it('builds a childrenEvaluator when enforcement.children is configured', () => {
    const isLi = (_child: unknown): _child is unknown => true
    const bundle = buildRuntime(
      {
        tag: 'ul',
        enforcement: {
          diagnostics: warnDiagnostics,
          children: [{ name: 'li', match: isLi, cardinality: { min: 1 } }],
        },
      },
      DefaultSlot,
      normalizeChildren,
    )
    expect('childrenEvaluator' in bundle).toBe(true)
  })

  it('composes filterProps so plugin-owned keys and the caller predicate both apply', () => {
    const bundle = buildRuntime(
      { tag: 'div', filterProps: (key: string) => key === 'internalOnly' },
      DefaultSlot,
      normalizeChildren,
    )
    expect(bundle.filterProps('internalOnly', new Set())).toBe(true)
    expect(bundle.filterProps('data-testid', new Set())).toBe(false)
  })

  it("filters a plugin's owned keys before consulting the caller predicate", () => {
    const bundle = buildRuntime(
      {
        tag: 'div',
        styling: {
          plugin: () => ({
            pipeline: () => '',
            ownedKeys: new Set(['ownedKey']),
          }),
        },
      },
      DefaultSlot,
      normalizeChildren,
    )
    expect(bundle.filterProps('ownedKey', new Set())).toBe(true)
  })
})
