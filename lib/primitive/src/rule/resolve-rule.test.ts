import { describe, expect, it } from 'vitest'

import type { Rule } from '../types'
import { dynamic } from './dynamic'
import { isDynamicRule } from './is-dynamic-rule'
import { resolveRule } from './resolve-rule'

// Untyped/JS callers can hand resolveRule an object that merely duck-types a
// DynamicRule (has a `resolve` method) without the brand. Cast past the type
// system to exercise that runtime case, same as `isDynamicRule` must.
const asRule = <T, C>(value: unknown): Rule<T, C> => value as Rule<T, C>

describe('resolveRule()', () => {
  it('returns a static value as-is', () => {
    expect(resolveRule(42, { any: 'context' })).toBe(42)
    expect(resolveRule('div', undefined)).toBe('div')
  })

  it('returns a static object value as-is, without inspecting its shape', () => {
    const value = { min: 1, max: 4 }
    expect(resolveRule(value, undefined)).toBe(value)
  })

  it('resolves a dynamic rule by calling resolve() with the context', () => {
    const rule = dynamic((ctx: { tag: string }) => (ctx.tag === 'section' ? 1 : 0))
    expect(resolveRule(rule, { tag: 'section' })).toBe(1)
    expect(resolveRule(rule, { tag: 'div' })).toBe(0)
  })

  it('does not confuse a static function-shaped value for a dynamic rule', () => {
    const match = (child: unknown) => child === 'x'
    expect(resolveRule(match, { tag: 'section' })).toBe(match)
  })

  it('does not confuse a plain object that happens to have a resolve method for a dynamic rule', () => {
    const lookAlike = { resolve: () => 'nope' }
    expect(resolveRule(asRule<typeof lookAlike, undefined>(lookAlike), undefined)).toBe(lookAlike)
  })
})

describe('isDynamicRule()', () => {
  it('is true for values created via dynamic()', () => {
    expect(isDynamicRule(dynamic(() => 1))).toBe(true)
  })

  it('is false for static values, including functions and resolve-shaped objects', () => {
    expect(isDynamicRule(1)).toBe(false)
    expect(isDynamicRule('div')).toBe(false)
    expect(isDynamicRule({ min: 1, max: 4 })).toBe(false)
    expect(isDynamicRule(() => true)).toBe(false)
    expect(isDynamicRule(asRule<string, undefined>({ resolve: () => 'nope' }))).toBe(false)
  })
})
