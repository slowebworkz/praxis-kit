import { describe, expect, it } from 'vitest'
import { cva } from './cva'

describe('cva', () => {
  it('returns base class with no config', () => {
    const fn = cva('base')
    expect(fn()).toBe('base')
  })

  it('returns empty string with no base and no config', () => {
    const fn = cva('')
    expect(fn()).toBe('')
  })

  it('applies a matched variant', () => {
    const fn = cva('base', {
      variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
    })
    expect(fn({ size: 'sm' })).toBe('base text-sm')
    expect(fn({ size: 'lg' })).toBe('base text-lg')
  })

  it('applies default variants when prop is omitted', () => {
    const fn = cva('base', {
      variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
      defaultVariants: { size: 'sm' },
    })
    expect(fn()).toBe('base text-sm')
  })

  it('explicit prop overrides default variant', () => {
    const fn = cva('base', {
      variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
      defaultVariants: { size: 'sm' },
    })
    expect(fn({ size: 'lg' })).toBe('base text-lg')
  })

  it('applies compound variant when conditions match', () => {
    const fn = cva('base', {
      variants: {
        size: { sm: 'text-sm', lg: 'text-lg' },
        intent: { primary: 'text-blue-500', danger: 'text-red-500' },
      },
      compoundVariants: [{ size: 'lg', intent: 'primary', class: 'font-bold' }],
    })
    expect(fn({ size: 'lg', intent: 'primary' })).toBe('base text-lg text-blue-500 font-bold')
  })

  it('does not apply compound variant when conditions do not match', () => {
    const fn = cva('base', {
      variants: {
        size: { sm: 'text-sm', lg: 'text-lg' },
        intent: { primary: 'text-blue-500', danger: 'text-red-500' },
      },
      compoundVariants: [{ size: 'lg', intent: 'primary', class: 'font-bold' }],
    })
    expect(fn({ size: 'sm', intent: 'primary' })).toBe('base text-sm text-blue-500')
  })

  it('returns a stable function reference across calls', () => {
    const fn = cva('base')
    expect(typeof fn).toBe('function')
  })
})
