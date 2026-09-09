import { describe, expect, it } from 'vitest'

import { makeResolveTag, resolveTag } from './resolve-tag'

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
    expect(resolveTag('div')).toBe('div')
  })
})

describe('makeResolveTag()', () => {
  it('returns defaultTag when called with no arguments', () => {
    const tag = makeResolveTag('div')
    expect(tag()).toBe('div')
  })

  it('returns the provided as tag', () => {
    const tag = makeResolveTag('div')
    expect(tag('article')).toBe('article')
  })

  it('overrides the defaultTag with a different string', () => {
    const tag = makeResolveTag('section')
    expect(tag('span')).toBe('span')
  })

  it('uses the defaultTag when no argument is given (non-div)', () => {
    const tag = makeResolveTag('nav')
    expect(tag()).toBe('nav')
  })

  it('overrides with an arbitrary tag string', () => {
    const tag = makeResolveTag('section')
    expect(tag('aside')).toBe('aside')
  })

  it('returns the same function reference on each access', () => {
    const tag = makeResolveTag('section')
    expect(tag).toBe(tag)
  })
})
