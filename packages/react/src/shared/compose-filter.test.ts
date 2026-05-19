import { describe, expect, it } from 'vitest'

import { composeFilter } from './compose-filter'

const variantKeys: ReadonlySet<string> = new Set(['size', 'intent'])

describe('composeFilter — no ownedKeys, no userFilter', () => {
  const filter = composeFilter(undefined, undefined)

  it('strips variant keys', () => {
    expect(filter('size', variantKeys)).toBe(true)
    expect(filter('intent', variantKeys)).toBe(true)
  })

  it('passes through non-variant props', () => {
    expect(filter('className', variantKeys)).toBe(false)
    expect(filter('flex', variantKeys)).toBe(false)
  })
})

describe('composeFilter — ownedKeys only', () => {
  const ownedKeys = new Set(['flex', 'grid'])
  const filter = composeFilter(ownedKeys, undefined)

  it('strips owned keys', () => {
    expect(filter('flex', variantKeys)).toBe(true)
    expect(filter('grid', variantKeys)).toBe(true)
  })

  it('strips variant keys', () => {
    expect(filter('size', variantKeys)).toBe(true)
  })

  it('passes through unrelated props', () => {
    expect(filter('className', variantKeys)).toBe(false)
    expect(filter('onClick', variantKeys)).toBe(false)
  })
})

describe('composeFilter — userFilter only', () => {
  const userFilter = (key: string) => key === 'data-internal'
  const filter = composeFilter(undefined, userFilter)

  it('strips keys matched by userFilter', () => {
    expect(filter('data-internal', variantKeys)).toBe(true)
  })

  it('still strips variant keys', () => {
    expect(filter('size', variantKeys)).toBe(true)
  })

  it('passes through unrelated props', () => {
    expect(filter('className', variantKeys)).toBe(false)
  })
})

describe('composeFilter — ownedKeys + userFilter', () => {
  const ownedKeys = new Set(['flex', 'grid'])
  const userFilter = (key: string) => key === 'data-internal'
  const filter = composeFilter(ownedKeys, userFilter)

  it('strips owned keys', () => {
    expect(filter('flex', variantKeys)).toBe(true)
    expect(filter('grid', variantKeys)).toBe(true)
  })

  it('strips keys matched by userFilter', () => {
    expect(filter('data-internal', variantKeys)).toBe(true)
  })

  it('strips variant keys', () => {
    expect(filter('size', variantKeys)).toBe(true)
  })

  it('passes through unrelated props', () => {
    expect(filter('className', variantKeys)).toBe(false)
    expect(filter('onClick', variantKeys)).toBe(false)
  })
})
