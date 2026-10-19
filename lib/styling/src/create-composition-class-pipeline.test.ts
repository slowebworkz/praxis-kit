import { describe, expect, it, vi } from 'vitest'

import { createCompositionClassPipeline } from './create-composition-class-pipeline'

describe('createCompositionClassPipeline', () => {
  it('combines partner and primary base classes, compatible variants, and caller classes in order', () => {
    const pipeline = createCompositionClassPipeline({
      partner: {
        baseClassName: 'partner-base',
        variants: { size: { sm: 'partner-sm', lg: 'partner-lg' } },
      },
      primary: {
        baseClassName: 'primary-base',
        variants: { size: { lg: 'primary-lg', sm: 'primary-sm' } },
      },
    })

    expect(pipeline('div', { size: 'lg' }, 'caller-class')).toBe(
      'partner-base primary-base partner-lg primary-lg caller-class',
    )
  })

  it('inherits partner-only variants and primary-only variants', () => {
    const pipeline = createCompositionClassPipeline({
      partner: { variants: { tone: { quiet: 'quiet-class' } } },
      primary: { variants: { size: { large: 'large-class' } } },
    })

    expect(pipeline('div', { tone: 'quiet', size: 'large' }, '')).toContain('quiet-class')
    expect(pipeline('div', { tone: 'quiet', size: 'large' }, '')).toContain('large-class')
  })

  it('uses the primary definition and diagnoses incompatible variant value sets', () => {
    const onDiagnostic = vi.fn()
    const pipeline = createCompositionClassPipeline({
      partner: { variants: { intent: { quiet: 'partner-quiet', loud: 'partner-loud' } } },
      primary: { variants: { intent: { quiet: 'primary-quiet', danger: 'primary-danger' } } },
      onDiagnostic,
    })

    expect(pipeline('div', { intent: 'quiet' }, '')).toContain('primary-quiet')
    expect(pipeline('div', { intent: 'quiet' }, '')).not.toContain('partner-quiet')
    expect(onDiagnostic).toHaveBeenCalledOnce()
    expect(onDiagnostic.mock.calls[0]?.[0]).toContain('Incompatible composed variant "intent"')
  })

  it('applies defaults in partner, composition, then primary precedence', () => {
    const pipeline = createCompositionClassPipeline({
      partner: {
        variants: { size: { sm: 'small', md: 'medium', lg: 'large' } },
        defaultVariants: { size: 'sm' },
      },
      composeDefaults: { size: 'md' },
      primary: { defaultVariants: { size: 'lg' } },
    })

    expect(pipeline('div', {}, '')).toContain('large')
  })

  it('uses recipe values above defaults but lets explicit props override recipe values', () => {
    const pipeline = createCompositionClassPipeline({
      partner: {
        variants: { size: { sm: 'small', lg: 'large' } },
        defaultVariants: { size: 'sm' },
        recipeMap: { compact: { size: 'sm' } },
      },
      primary: { recipeMap: { compact: { size: 'lg' } } },
    })

    expect(pipeline('div', {}, '', 'compact')).toContain('large')
    expect(pipeline('div', { size: 'sm' }, '', 'compact')).toContain('small')
    expect(pipeline('div', { size: 'sm' }, '', 'compact')).not.toContain('large')
  })

  it('combines recipe maps with primary values winning duplicate keys', () => {
    const pipeline = createCompositionClassPipeline({
      partner: {
        variants: { size: { sm: 'small', lg: 'large' }, tone: { quiet: 'quiet' } },
        recipeMap: { compact: { size: 'sm', tone: 'quiet' } },
      },
      primary: { recipeMap: { compact: { size: 'lg' } } },
    })

    const result = pipeline('div', {}, '', 'compact')
    expect(result).toContain('large')
    expect(result).toContain('quiet')
    expect(result).not.toContain('small')
  })

  it('merges tags partner-first and does not reuse per-contract precomputed classes', () => {
    const pipeline = createCompositionClassPipeline({
      partner: {
        baseClassName: 'partner-base',
        tagMap: { section: 'partner-tag' },
        precomputedClasses: { none: 'unsafe' },
      },
      primary: {
        baseClassName: 'primary-base',
        tagMap: { section: 'primary-tag' },
        precomputedClasses: { none: 'also-unsafe' },
      },
    })

    const result = pipeline('section', {}, '')
    expect(result).toContain('partner-base primary-base')
    expect(result).toContain('partner-tag primary-tag')
    expect(result).not.toContain('unsafe')
  })
})
