import { describe, expect, it } from 'vitest'

import { cva } from './cva'
import { VariantClassResolver } from './variant-class-resolver'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sizeFn = cva('', {
  variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
  defaultVariants: { size: 'sm' },
})

const intentFn = cva('', {
  variants: {
    size: { sm: 'text-sm', lg: 'text-lg' },
    intent: { primary: 'text-blue-500', danger: 'text-red-500' },
  },
  defaultVariants: { size: 'sm', intent: 'primary' },
})

// ---------------------------------------------------------------------------
// No CVA fn
// ---------------------------------------------------------------------------

describe('VariantClassResolver — no CVA fn', () => {
  it('returns empty string when cvaFn is null', () => {
    const r = new VariantClassResolver(null)
    expect(r.resolve({ props: {}, variantKey: undefined })).toBe('')
  })

  it('returns empty string with preset when cvaFn is null', () => {
    const r = new VariantClassResolver(null, { primary: { size: 'lg' } })
    expect(r.resolve({ props: {}, variantKey: 'primary' })).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Variants from props
// ---------------------------------------------------------------------------

describe('VariantClassResolver — variant props', () => {
  it('applies defaultVariants when no props provided', () => {
    const r = new VariantClassResolver(sizeFn)
    expect(r.resolve({ props: {}, variantKey: undefined })).toContain('text-sm')
  })

  it('applies explicit variant prop', () => {
    const r = new VariantClassResolver(sizeFn)
    expect(r.resolve({ props: { size: 'lg' }, variantKey: undefined })).toContain('text-lg')
  })

  it('applies multiple variant props', () => {
    const r = new VariantClassResolver(intentFn)
    const result = r.resolve({ props: { size: 'lg', intent: 'danger' }, variantKey: undefined })
    expect(result).toContain('text-lg')
    expect(result).toContain('text-red-500')
  })
})

// ---------------------------------------------------------------------------
// presetMap
// ---------------------------------------------------------------------------

describe('VariantClassResolver — presetMap', () => {
  it('merges preset props into variant resolution', () => {
    const r = new VariantClassResolver(sizeFn, { large: { size: 'lg' } })
    expect(r.resolve({ props: {}, variantKey: 'large' })).toContain('text-lg')
  })

  it('explicit props override preset', () => {
    const r = new VariantClassResolver(sizeFn, { large: { size: 'lg' } })
    expect(r.resolve({ props: { size: 'sm' }, variantKey: 'large' })).toContain('text-sm')
    expect(r.resolve({ props: { size: 'sm' }, variantKey: 'large' })).not.toContain('text-lg')
  })

  it('falls back to defaultVariants when preset key is missing', () => {
    const r = new VariantClassResolver(sizeFn, {})
    expect(r.resolve({ props: {}, variantKey: 'nonexistent' })).toContain('text-sm')
  })

  it('unknown variantKey does not throw', () => {
    const r = new VariantClassResolver(sizeFn, { primary: { size: 'sm' } })
    expect(() => r.resolve({ props: {}, variantKey: 'unknown' })).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------

describe('VariantClassResolver — caching', () => {
  it('returns same string on repeated identical calls', () => {
    const r = new VariantClassResolver(sizeFn)
    const first = r.resolve({ props: { size: 'lg' }, variantKey: undefined })
    const second = r.resolve({ props: { size: 'lg' }, variantKey: undefined })
    expect(first).toBe(second)
  })

  it('different props produce different results', () => {
    const r = new VariantClassResolver(sizeFn)
    const sm = r.resolve({ props: { size: 'sm' }, variantKey: undefined })
    const lg = r.resolve({ props: { size: 'lg' }, variantKey: undefined })
    expect(sm).not.toBe(lg)
  })

  it('different variantKeys produce different results', () => {
    const r = new VariantClassResolver(sizeFn, {
      small: { size: 'sm' },
      large: { size: 'lg' },
    })
    const sm = r.resolve({ props: {}, variantKey: 'small' })
    const lg = r.resolve({ props: {}, variantKey: 'large' })
    expect(sm).not.toBe(lg)
  })
})
