import { describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'
import { buildRuntime } from './build-runtime'
import { SlotValidator } from './slot/slot-validator'
import { AriaPolicyEngine, ChildrenEvaluator } from '@polymorphic-ui/core'

const noopSlot = (() => null) as unknown as Parameters<typeof buildRuntime>[1]
const noopNormalize = (children: unknown): ReactElement[] =>
  Array.isArray(children) ? (children as ReactElement[]) : [children as ReactElement]

describe('buildRuntime — defaults', () => {
  it('returns a runtime with resolveTag, resolveProps, resolveClasses', () => {
    const { runtime } = buildRuntime({}, noopSlot, noopNormalize)
    expect(typeof runtime.resolveTag).toBe('function')
    expect(typeof runtime.resolveProps).toBe('function')
    expect(typeof runtime.resolveClasses).toBe('function')
  })

  it('uses the provided slotComponent', () => {
    const MySlot = (() => null) as unknown as Parameters<typeof buildRuntime>[1]
    const { slotComponent } = buildRuntime({}, MySlot, noopNormalize)
    expect(slotComponent).toBe(MySlot)
  })

  it('falls back to the defaultSlot when options.slotComponent is absent', () => {
    const { slotComponent } = buildRuntime({}, noopSlot, noopNormalize)
    expect(slotComponent).toBe(noopSlot)
  })

  it('returns the normalizeChildren function unchanged', () => {
    const { normalizeChildren } = buildRuntime({}, noopSlot, noopNormalize)
    expect(normalizeChildren).toBe(noopNormalize)
  })

  it('returns a SlotValidator instance', () => {
    const { slotValidator } = buildRuntime({}, noopSlot, noopNormalize)
    expect(slotValidator).toBeInstanceOf(SlotValidator)
  })

  it('returns an AriaPolicyEngine instance', () => {
    const { ariaEngine } = buildRuntime({}, noopSlot, noopNormalize)
    expect(ariaEngine).toBeInstanceOf(AriaPolicyEngine)
  })

  it('omits childrenEvaluator when no enforcement.children provided', () => {
    const result = buildRuntime({}, noopSlot, noopNormalize)
    expect('childrenEvaluator' in result).toBe(false)
  })

  it('returns a filterProps function', () => {
    const { filterProps } = buildRuntime({}, noopSlot, noopNormalize)
    expect(typeof filterProps).toBe('function')
  })
})

describe('buildRuntime — with name', () => {
  it('passes name to the core runtime options as displayName', () => {
    const { runtime } = buildRuntime({ name: 'MyButton' }, noopSlot, noopNormalize)
    expect(runtime.options.displayName).toBe('MyButton')
  })
})

describe('buildRuntime — with enforcement.children', () => {
  it('returns a ChildrenEvaluator when enforcement.children are provided', () => {
    const children = [
      { name: 'button', match: (c: unknown) => c !== null, cardinality: { min: 1, max: 1 } },
    ]
    const result = buildRuntime({ enforcement: { children } }, noopSlot, noopNormalize)
    expect(result.childrenEvaluator).toBeInstanceOf(ChildrenEvaluator)
  })

  it('omits childrenEvaluator when enforcement.children is an empty array', () => {
    const result = buildRuntime({ enforcement: { children: [] } }, noopSlot, noopNormalize)
    expect('childrenEvaluator' in result).toBe(false)
  })
})

describe('buildRuntime — filterProps strips variant keys', () => {
  it('strips variant keys from rendered props', () => {
    const variants = { size: { sm: 'text-sm', lg: 'text-lg' } } as const
    const { filterProps, runtime } = buildRuntime(
      { styling: { variants } },
      noopSlot,
      noopNormalize,
    )
    expect(filterProps('size', runtime.options.variantKeys)).toBe(true)
    expect(filterProps('className', runtime.options.variantKeys)).toBe(false)
  })
})

describe('buildRuntime — runtime resolveTag', () => {
  it('defaults to div', () => {
    const { runtime } = buildRuntime({}, noopSlot, noopNormalize)
    expect(runtime.resolveTag()).toBe('div')
  })

  it('respects a custom tag', () => {
    const { runtime } = buildRuntime({ tag: 'section' }, noopSlot, noopNormalize)
    expect(runtime.resolveTag()).toBe('section')
  })

  it('overrides the default with an as prop', () => {
    const { runtime } = buildRuntime({ tag: 'div' }, noopSlot, noopNormalize)
    expect(runtime.resolveTag('nav')).toBe('nav')
  })
})

describe('buildRuntime — slotComponent override in options', () => {
  it('prefers options.slotComponent over defaultSlot', () => {
    const optionSlot = (() => null) as unknown as Parameters<typeof buildRuntime>[1]
    const defaultSlot = (() => null) as unknown as Parameters<typeof buildRuntime>[1]
    const { slotComponent } = buildRuntime(
      { slotComponent: optionSlot },
      defaultSlot,
      noopNormalize,
    )
    expect(slotComponent).toBe(optionSlot)
  })
})
