import { describe, expect, it } from 'vitest'
import type { MergeStrategy } from './types'

interface StyleContext {
  classes: string[]
}

interface FlatContext {
  a: number
  b: string
}

describe('MergeStrategy', () => {
  it('accepts an implementation that accumulates arrays', () => {
    const strategy: MergeStrategy<StyleContext> = {
      merge: (previous, incoming) => ({
        classes: [...previous.classes, ...(incoming.classes ?? [])],
      }),
    }
    const result = strategy.merge({ classes: ['base'] }, { classes: ['hover:bg-blue-500'] })
    expect(result).toEqual({ classes: ['base', 'hover:bg-blue-500'] })
  })

  it('accepts an implementation that performs shallow merge', () => {
    const strategy: MergeStrategy<FlatContext> = {
      merge: (previous, incoming) => ({ ...previous, ...incoming }),
    }
    const result = strategy.merge({ a: 1, b: 'x' }, { b: 'y' })
    expect(result).toEqual({ a: 1, b: 'y' })
  })

  it('incoming is Partial — absent fields leave previous values intact', () => {
    const strategy: MergeStrategy<FlatContext> = {
      merge: (previous, incoming) => ({ ...previous, ...incoming }),
    }
    const result = strategy.merge({ a: 1, b: 'x' }, {})
    expect(result).toEqual({ a: 1, b: 'x' })
  })

  it('returns a complete TContext, not a Partial', () => {
    const strategy: MergeStrategy<StyleContext> = {
      merge: (previous, incoming) => ({
        classes: [...previous.classes, ...(incoming.classes ?? [])],
      }),
    }
    const result: StyleContext = strategy.merge({ classes: [] }, {})
    expect(result.classes).toEqual([])
  })

  it('different strategies can coexist for different context types', () => {
    const styleStrategy: MergeStrategy<StyleContext> = {
      merge: (prev, inc) => ({ classes: [...prev.classes, ...(inc.classes ?? [])] }),
    }
    const flatStrategy: MergeStrategy<FlatContext> = {
      merge: (prev, inc) => ({ ...prev, ...inc }),
    }
    expect(styleStrategy.merge({ classes: ['a'] }, { classes: ['b'] })).toEqual({
      classes: ['a', 'b'],
    })
    expect(flatStrategy.merge({ a: 1, b: 'x' }, { a: 2 })).toEqual({ a: 2, b: 'x' })
  })

  it('is symmetric with Backend — both are policy objects with a single method', () => {
    const strategy: MergeStrategy<StyleContext> = {
      merge: (prev, inc) => ({ classes: [...prev.classes, ...(inc.classes ?? [])] }),
    }
    expect(strategy.merge({ classes: ['a'] }, { classes: ['b'] })).toEqual({ classes: ['a', 'b'] })
  })
})
