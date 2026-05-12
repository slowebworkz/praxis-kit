import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins multiple strings', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('filters out falsy values', () => {
    expect(cn('a', false, null, undefined, 0, '', 'b')).toBe('a b')
  })

  it('handles conditional objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('handles arrays', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c')
  })

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('')
  })

  it('returns empty string for all falsy arguments', () => {
    expect(cn(false, null, undefined)).toBe('')
  })
})
