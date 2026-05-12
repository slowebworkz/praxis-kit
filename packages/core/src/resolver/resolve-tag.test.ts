import { describe, expect, it } from 'vitest'

import { resolveTag } from './resolve-tag'

describe('resolveTag()', () => {
  it('returns defaultTag when as is undefined', () => {
    expect(resolveTag('div')).toBe('div')
    expect(resolveTag('section')).toBe('section')
  })

  it('returns as when provided', () => {
    expect(resolveTag('div', 'article')).toBe('article')
    expect(resolveTag('div', 'nav')).toBe('nav')
  })

  it('returns as over defaultTag', () => {
    expect(resolveTag('section', 'div')).toBe('div')
  })

  it('works with non-string default tags', () => {
    const FakeComponent = () => null
    expect(resolveTag(FakeComponent)).toBe(FakeComponent)
    expect(resolveTag(FakeComponent, 'div')).toBe('div')
  })

  it('works with non-string as', () => {
    const FakeComponent = () => null
    expect(resolveTag('div', FakeComponent)).toBe(FakeComponent)
  })

  it('returns defaultTag when as is explicitly undefined', () => {
    expect(resolveTag('div', undefined)).toBe('div')
  })
})
