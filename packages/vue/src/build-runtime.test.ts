import { describe, expect, it } from 'vitest'
import { ChildrenEvaluator } from '@praxis-ui/core'
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

  it('omits childrenEvaluator when no enforcement.children provided', () => {
    const result = buildRuntime({})
    expect('childrenEvaluator' in result).toBe(false)
  })

  it('returns a filterProps function', () => {
    const { filterProps } = buildRuntime({})
    expect(typeof filterProps).toBe('function')
  })
})

describe('buildRuntime — with name', () => {
  it('passes name to the core runtime options as displayName', () => {
    const { runtime } = buildRuntime({ name: 'MyButton' })
    expect(runtime.options.displayName).toBe('MyButton')
  })

  it('defaults displayName to PolymorphicComponent', () => {
    const { runtime } = buildRuntime({})
    expect(runtime.options.displayName).toBe('PolymorphicComponent')
  })
})

describe('buildRuntime — with enforcement.children', () => {
  it('returns a ChildrenEvaluator when enforcement.children are provided', () => {
    const children = [
      { name: 'item', match: (c: unknown) => c !== null, cardinality: { min: 1, max: 3 } },
    ]
    const result = buildRuntime({ enforcement: { children } })
    expect(result.childrenEvaluator).toBeInstanceOf(ChildrenEvaluator)
  })

  it('omits childrenEvaluator when enforcement.children is an empty array', () => {
    const result = buildRuntime({ enforcement: { children: [] } })
    expect('childrenEvaluator' in result).toBe(false)
  })
})

describe('buildRuntime — filterProps strips variant keys', () => {
  it('strips variant keys from props', () => {
    const variants = { size: { sm: 'text-sm', lg: 'text-lg' } } as const
    const { filterProps, runtime } = buildRuntime({ styling: { variants } })
    expect(filterProps('size', runtime.options.variantKeys)).toBe(true)
    expect(filterProps('class', runtime.options.variantKeys)).toBe(false)
  })
})

describe('buildRuntime — runtime resolveTag', () => {
  it('defaults to div', () => {
    const { runtime } = buildRuntime({})
    expect(runtime.resolveTag()).toBe('div')
  })

  it('respects a custom tag', () => {
    const { runtime } = buildRuntime({ tag: 'section' })
    expect(runtime.resolveTag()).toBe('section')
  })

  it('overrides the default with an as value', () => {
    const { runtime } = buildRuntime({ tag: 'div' })
    expect(runtime.resolveTag('nav')).toBe('nav')
  })
})

describe('buildRuntime — strict default', () => {
  it('defaults strict to false when no enforcement is declared', () => {
    const { runtime } = buildRuntime({})
    expect(runtime.options.strict).toBe(false)
  })

  it('respects an explicit strict value', () => {
    const { runtime } = buildRuntime({ enforcement: { strict: false } })
    expect(runtime.options.strict).toBe(false)
  })
})
