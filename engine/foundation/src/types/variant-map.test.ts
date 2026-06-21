import { describe, expect, it } from 'vitest'
import type { VariantMap } from './variant-map'

describe('VariantMap', () => {
  it('holds string arrays keyed by variant name', () => {
    const map: VariantMap = { size: ['sm', 'md', 'lg'], intent: ['primary', 'ghost'] }
    expect(map['size']).toEqual(['sm', 'md', 'lg'])
    expect(map['intent']).toEqual(['primary', 'ghost'])
  })

  it('accepts an empty map', () => {
    const map: VariantMap = {}
    expect(Object.keys(map)).toHaveLength(0)
  })

  it('accepts a variant with a single value', () => {
    const map: VariantMap = { disabled: ['true'] }
    expect(map['disabled']).toEqual(['true'])
  })
})
