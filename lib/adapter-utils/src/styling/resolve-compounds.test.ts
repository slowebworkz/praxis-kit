import { describe, expect, it } from 'vitest'
import { resolveCompounds } from './resolve-compounds'
import type { CompoundRecord } from './build-variant-config'

describe('resolveCompounds', () => {
  it('returns empty array when compounds is undefined', () => {
    expect(resolveCompounds({ size: 'sm' }, undefined)).toEqual([])
  })

  it('returns empty array when compounds is empty', () => {
    expect(resolveCompounds({ size: 'sm' }, [])).toEqual([])
  })

  it('returns empty array when no compound conditions match', () => {
    const compounds: CompoundRecord[] = [{ size: 'sm', color: 'red', class: 'font-bold' }]
    expect(resolveCompounds({ size: 'lg', color: 'red' }, compounds)).toEqual([])
  })

  it('returns the class when all conditions match', () => {
    const compounds: CompoundRecord[] = [{ size: 'sm', color: 'red', class: 'font-bold' }]
    expect(resolveCompounds({ size: 'sm', color: 'red' }, compounds)).toEqual(['font-bold'])
  })

  it('flattens array class values to a space-joined string', () => {
    const compounds: CompoundRecord[] = [{ size: 'sm', class: ['text-sm', 'font-bold'] }]
    expect(resolveCompounds({ size: 'sm' }, compounds)).toEqual(['text-sm font-bold'])
  })

  it('matches when condition value is an array and active value is one of them', () => {
    const compounds: CompoundRecord[] = [{ size: ['sm', 'md'], class: 'compact' }]
    expect(resolveCompounds({ size: 'sm' }, compounds)).toEqual(['compact'])
    expect(resolveCompounds({ size: 'md' }, compounds)).toEqual(['compact'])
    expect(resolveCompounds({ size: 'lg' }, compounds)).toEqual([])
  })

  it('collects classes from multiple matching compounds', () => {
    const compounds: CompoundRecord[] = [
      { size: 'sm', class: 'text-sm' },
      { color: 'red', class: 'text-red-500' },
    ]
    const result = resolveCompounds({ size: 'sm', color: 'red' }, compounds)
    expect(result).toEqual(['text-sm', 'text-red-500'])
  })

  it('only collects classes from compounds whose conditions all match', () => {
    const compounds: CompoundRecord[] = [
      { size: 'sm', color: 'red', class: 'both' },
      { size: 'sm', color: 'blue', class: 'blue-only' },
    ]
    expect(resolveCompounds({ size: 'sm', color: 'red' }, compounds)).toEqual(['both'])
  })
})
