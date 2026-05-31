import { describe, expect, it } from 'vitest'

import type { ClassifiedToken } from './types/classified-token'
import { DependencyEvaluator } from './dependency-evaluator'
import type { DependencyRules } from './dependency-rules'
import { LayoutState } from './layout-state'

const rules: DependencyRules = {
  flex: [/^flex-/, /^grow/, /^shrink/, /^basis-/],
  grid: [/^grid-/, /^col-/, /^row-/, /^auto-cols-/, /^auto-rows-/],
}

const ev = new DependencyEvaluator(rules)

const flexState = new LayoutState('flex')
const gridState = new LayoutState('grid')
const noneState = new LayoutState('none')

function tok(t: ClassifiedToken) {
  return t
}

describe('DependencyEvaluator — layout tokens', () => {
  it('passes flex layout token when mode is flex', () => {
    expect(ev.evaluate(tok({ kind: 'layout', value: 'flex', raw: 'flex' }), flexState)).toBe(true)
  })

  it('blocks flex layout token when mode is grid', () => {
    expect(ev.evaluate(tok({ kind: 'layout', value: 'flex', raw: 'flex' }), gridState)).toBe(false)
  })

  it('blocks flex layout token when mode is none', () => {
    expect(ev.evaluate(tok({ kind: 'layout', value: 'flex', raw: 'flex' }), noneState)).toBe(false)
  })

  it('passes grid layout token when mode is grid', () => {
    expect(ev.evaluate(tok({ kind: 'layout', value: 'grid', raw: 'grid' }), gridState)).toBe(true)
  })

  it('blocks grid layout token when mode is flex', () => {
    expect(ev.evaluate(tok({ kind: 'layout', value: 'grid', raw: 'grid' }), flexState)).toBe(false)
  })

  it('blocks grid layout token when mode is none', () => {
    expect(ev.evaluate(tok({ kind: 'layout', value: 'grid', raw: 'grid' }), noneState)).toBe(false)
  })
})

describe('DependencyEvaluator — conditional tokens', () => {
  const flexCond = tok({ kind: 'conditional', requires: 'flex', raw: '[&.flex]:items-center' })
  const gridCond = tok({ kind: 'conditional', requires: 'grid', raw: '[&.grid]:grid-cols-3' })

  it('passes flex conditional when mode is flex', () => {
    expect(ev.evaluate(flexCond, flexState)).toBe(true)
  })

  it('blocks flex conditional when mode is grid', () => {
    expect(ev.evaluate(flexCond, gridState)).toBe(false)
  })

  it('passes grid conditional when mode is grid', () => {
    expect(ev.evaluate(gridCond, gridState)).toBe(true)
  })

  it('blocks grid conditional when mode is flex', () => {
    expect(ev.evaluate(gridCond, flexState)).toBe(false)
  })
})

describe('DependencyEvaluator — flex-dependent utilities', () => {
  for (const [label, base] of [
    ['flex-col', 'flex-col'],
    ['grow', 'grow'],
    ['shrink-0', 'shrink-0'],
    ['basis-1/2', 'basis-1/2'],
  ] as const) {
    const t = tok({ kind: 'utility', base, raw: base })

    it(`passes ${label} when mode is flex`, () => {
      expect(ev.evaluate(t, flexState)).toBe(true)
    })

    it(`blocks ${label} when mode is grid`, () => {
      expect(ev.evaluate(t, gridState)).toBe(false)
    })

    it(`blocks ${label} when mode is none`, () => {
      expect(ev.evaluate(t, noneState)).toBe(false)
    })
  }
})

describe('DependencyEvaluator — grid-dependent utilities', () => {
  for (const [label, base] of [
    ['grid-cols-3', 'grid-cols-3'],
    ['col-span-2', 'col-span-2'],
    ['row-span-1', 'row-span-1'],
    ['auto-cols-fr', 'auto-cols-fr'],
  ] as const) {
    const t = tok({ kind: 'utility', base, raw: base })

    it(`passes ${label} when mode is grid`, () => {
      expect(ev.evaluate(t, gridState)).toBe(true)
    })

    it(`blocks ${label} when mode is flex`, () => {
      expect(ev.evaluate(t, flexState)).toBe(false)
    })
  }
})

describe('DependencyEvaluator — layout-agnostic utilities', () => {
  const rounded = tok({ kind: 'utility', base: 'rounded', raw: 'rounded' })

  it('passes in flex mode', () => expect(ev.evaluate(rounded, flexState)).toBe(true))
  it('passes in grid mode', () => expect(ev.evaluate(rounded, gridState)).toBe(true))
  it('passes in none mode', () => expect(ev.evaluate(rounded, noneState)).toBe(true))
})

describe('DependencyEvaluator — gap tokens', () => {
  const gap = tok({ kind: 'gap', raw: 'gap-4' })

  it('passes gap when mode is flex', () => expect(ev.evaluate(gap, flexState)).toBe(true))
  it('passes gap when mode is grid', () => expect(ev.evaluate(gap, gridState)).toBe(true))
  it('blocks gap when mode is none', () => expect(ev.evaluate(gap, noneState)).toBe(false))
})

describe('DependencyEvaluator — custom rules', () => {
  it('respects injected rules over defaults', () => {
    const customRules: DependencyRules = { flex: [/^order-/], grid: [] }
    const custom = new DependencyEvaluator(customRules)
    const order = tok({ kind: 'utility', base: 'order-2', raw: 'order-2' })

    expect(custom.evaluate(order, flexState)).toBe(true)
    expect(custom.evaluate(order, gridState)).toBe(false)
  })
})
