import { describe, expect, it } from 'vitest'
import { AriaPolicyEngine, ChildrenEvaluator } from '@polymorphic-ui/core'
import { buildRuntime } from './build-runtime'
import { SlotValidator } from './slot/slot-validator'

describe('buildRuntime — defaults', () => {
  it('returns a runtime with resolveTag, resolveProps, resolveClasses', () => {
    const { runtime } = buildRuntime({})
    expect(typeof runtime.resolveTag).toBe('function')
    expect(typeof runtime.resolveProps).toBe('function')
    expect(typeof runtime.resolveClasses).toBe('function')
  })

  it('returns a SlotValidator instance', () => {
    const { slotValidator } = buildRuntime({})
    expect(slotValidator).toBeInstanceOf(SlotValidator)
  })

  it('returns an AriaPolicyEngine instance', () => {
    const { ariaEngine } = buildRuntime({})
    expect(ariaEngine).toBeInstanceOf(AriaPolicyEngine)
  })

  it('omits childrenEvaluator when no childRules are provided', () => {
    const result = buildRuntime({})
    expect('childrenEvaluator' in result).toBe(false)
  })

  it('returns a filterProps function', () => {
    const { filterProps } = buildRuntime({})
    expect(typeof filterProps).toBe('function')
  })
})

describe('buildRuntime — with displayName', () => {
  it('passes displayName to the core runtime options', () => {
    const { runtime } = buildRuntime({ displayName: 'MyButton' })
    expect(runtime.options.displayName).toBe('MyButton')
  })

  it('defaults displayName to PolymorphicComponent', () => {
    const { runtime } = buildRuntime({})
    expect(runtime.options.displayName).toBe('PolymorphicComponent')
  })
})

describe('buildRuntime — with childRules', () => {
  it('returns a ChildrenEvaluator when childRules are provided', () => {
    const childRules = [
      { name: 'item', match: (c: unknown) => c !== null, cardinality: { min: 1, max: 3 } },
    ]
    const result = buildRuntime({ childRules })
    expect(result.childrenEvaluator).toBeInstanceOf(ChildrenEvaluator)
  })

  it('omits childrenEvaluator when childRules is an empty array', () => {
    const result = buildRuntime({ childRules: [] })
    expect('childrenEvaluator' in result).toBe(false)
  })
})

describe('buildRuntime — filterProps strips variant keys', () => {
  it('strips variant keys from props', () => {
    const variants = { size: { sm: 'text-sm', lg: 'text-lg' } } as const
    const { filterProps, runtime } = buildRuntime({ variants })
    expect(filterProps('size', runtime.options.variantKeys)).toBe(true)
    expect(filterProps('class', runtime.options.variantKeys)).toBe(false)
  })
})

describe('buildRuntime — runtime resolveTag', () => {
  it('defaults to div', () => {
    const { runtime } = buildRuntime({})
    expect(runtime.resolveTag()).toBe('div')
  })

  it('respects a custom defaultTag', () => {
    const { runtime } = buildRuntime({ defaultTag: 'section' })
    expect(runtime.resolveTag()).toBe('section')
  })

  it('overrides the default with an as value', () => {
    const { runtime } = buildRuntime({ defaultTag: 'div' })
    expect(runtime.resolveTag('nav')).toBe('nav')
  })
})

describe('buildRuntime — strict default', () => {
  it('defaults strict to throw', () => {
    const { runtime } = buildRuntime({})
    expect(runtime.options.strict).toBe('throw')
  })

  it('respects an explicit strict value', () => {
    const { runtime } = buildRuntime({ strict: false })
    expect(runtime.options.strict).toBe(false)
  })
})
