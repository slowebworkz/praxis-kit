import { describe, expect, it, vi } from 'vitest'

import {
  createCompositionClassPipeline,
  mergeCompositionClassPipelineOptions,
} from './create-composition-class-pipeline'
import type { ClassPipelineOptions, VariantMap } from './types'

describe('mergeCompositionClassPipelineOptions', () => {
  it('returns merged style options without constructing a class pipeline or reusing precomputed classes', () => {
    const options = mergeCompositionClassPipelineOptions({
      partner: {
        baseClassName: 'partner-base',
        variants: { size: { sm: 'partner-sm', lg: 'partner-lg' } },
        precomputedClasses: { 'size=sm': 'partner-precomputed' },
      },
      primary: {
        baseClassName: 'primary-base',
        variants: { size: { lg: 'primary-lg', sm: 'primary-sm' } },
        precomputedClasses: { 'size=sm': 'primary-precomputed' },
      },
    })

    expect(options.baseClassName).toBe('partner-base primary-base')
    expect(options.variants?.size?.sm).toBe('partner-sm primary-sm')
    expect(options.variants?.size?.lg).toBe('partner-lg primary-lg')
    expect(options).not.toHaveProperty('precomputedClasses')
  })
})

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

  it('locks in: an unsupported partner default with no primary default selects nothing', () => {
    const pipeline = createCompositionClassPipeline({
      partner: {
        variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
        defaultVariants: { tone: 'loud' },
      },
      primary: { variants: { tone: { calm: 'primary-calm', bold: 'primary-bold' } } },
    })

    const result = pipeline('div', {}, '')
    expect(result).toBeUndefined()
  })

  it('ignores incompatible composition defaults but preserves a valid partner default', () => {
    const pipeline = createCompositionClassPipeline({
      partner: {
        variants: { tone: { calm: 'partner-calm', bold: 'partner-bold', loud: 'partner-loud' } },
        defaultVariants: { tone: 'calm' },
      },
      composeDefaults: { tone: 'loud' },
      primary: { variants: { tone: { calm: 'primary-calm', bold: 'primary-bold' } } },
    })

    // The variant is incompatible, so only the primary definition contributes; the partner's valid
    // default `calm` still selects the primary's `calm`, and the unsupported `loud` composition
    // default must not shadow it.
    const result = pipeline('div', {}, '')
    expect(result).toContain('primary-calm')
    expect(result).not.toContain('partner-')
  })

  it('locks in: a partner recipe value outside the primary definition selects nothing for that variant', () => {
    const pipeline = createCompositionClassPipeline({
      partner: {
        variants: {
          tone: { quiet: 'partner-quiet', loud: 'partner-loud' },
          size: { sm: 'partner-small', lg: 'partner-large' },
        },
        recipeMap: { compact: { tone: 'loud', size: 'sm' } },
      },
      primary: {
        variants: { tone: { calm: 'primary-calm', bold: 'primary-bold' } },
      },
    })

    const result = pipeline('div', {}, '', 'compact')
    expect(result).toContain('partner-small')
    expect(result).not.toContain('partner-loud')
    expect(result).not.toContain('primary-')
  })

  it('keeps the primary default when a partner recipe selects an unsupported value for that variant', () => {
    // A recipe outranks defaults, so an unfiltered partner recipe value `loud` would replace the
    // primary's `bold` default with a value the primary definition cannot resolve.
    const pipeline = createCompositionClassPipeline({
      partner: {
        variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
        recipeMap: { emphasis: { tone: 'loud' } },
      },
      primary: {
        variants: { tone: { calm: 'primary-calm', bold: 'primary-bold' } },
        defaultVariants: { tone: 'bold' },
      },
    })

    const result = pipeline('div', {}, '', 'emphasis')
    expect(result).toContain('primary-bold')
    expect(result).not.toContain('partner-')
  })

  it('preserves a primary recipe selection for an incompatible variant', () => {
    const pipeline = createCompositionClassPipeline({
      partner: {
        variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
        recipeMap: { compact: { tone: 'loud' } },
      },
      primary: {
        variants: { tone: { calm: 'primary-calm', bold: 'primary-bold' } },
        recipeMap: { compact: { tone: 'bold' } },
      },
    })

    const result = pipeline('div', {}, '', 'compact')
    expect(result).toContain('primary-bold')
    expect(result).not.toContain('partner-')
  })

  describe('partner compounds on incompatible variants', () => {
    // Policy: partner compounds stay owned by the partner and are evaluated against the combined
    // selection, but a condition on an incompatible variant may only name values the primary
    // definition supports. A supported scalar is kept; an unsupported scalar drops the compound;
    // an array is narrowed to its supported values (dropping the compound when none remain);
    // conditions on other variants are untouched; primary compounds are never filtered.
    const partnerTone = { quiet: 'partner-quiet', loud: 'partner-loud', calm: 'partner-calm' }
    const primaryTone = { calm: 'primary-calm', bold: 'primary-bold' }

    const make = (compoundVariants: ClassPipelineOptions<VariantMap>['compoundVariants']) =>
      createCompositionClassPipeline({
        partner: {
          variants: {
            tone: partnerTone,
            size: { sm: 'partner-sm', lg: 'partner-lg' },
          },
          ...(compoundVariants && { compoundVariants }),
        },
        primary: {
          variants: { tone: primaryTone, size: { sm: 'primary-sm', lg: 'primary-lg' } },
          compoundVariants: [{ tone: 'bold', class: 'primary-compound-bold' }],
        },
      })

    it('omits a partner compound whose scalar value the primary does not support', () => {
      const pipeline = make([{ tone: 'loud', class: 'partner-compound-loud' }])

      // No class is produced at all once the partner compound is omitted (`undefined`).
      expect(pipeline('div', { tone: 'loud' }, '') ?? '').not.toContain('partner-compound-loud')
    })

    it('keeps a partner compound whose scalar value the primary supports', () => {
      const pipeline = make([{ tone: 'calm', class: 'partner-compound-calm' }])

      const result = pipeline('div', { tone: 'calm' }, '')
      expect(result).toContain('partner-compound-calm')
      expect(result).toContain('primary-calm')
      // The partner's own variant class stays omitted: only the compound is retained.
      expect(result).not.toContain('partner-calm')
    })

    it('narrows an array condition to the values the primary supports', () => {
      const pipeline = make([{ tone: ['calm', 'loud'], class: 'partner-compound-array' }])

      expect(pipeline('div', { tone: 'calm' }, '')).toContain('partner-compound-array')
      expect(pipeline('div', { tone: 'loud' }, '') ?? '').not.toContain('partner-compound-array')
    })

    it('omits a partner compound whose array has no supported value', () => {
      const pipeline = make([{ tone: ['loud', 'quiet'], class: 'partner-compound-none' }])

      expect(pipeline('div', { tone: 'loud' }, '') ?? '').not.toContain('partner-compound-none')
      expect(pipeline('div', { tone: 'quiet' }, '') ?? '').not.toContain('partner-compound-none')
    })

    it('omits a mixed compound with an unsupported value and keeps one with a supported value', () => {
      const pipeline = make([
        { tone: 'loud', size: 'lg', class: 'partner-compound-loud-lg' },
        { tone: 'calm', size: 'lg', class: 'partner-compound-calm-lg' },
      ])

      const unsupported = pipeline('div', { tone: 'loud', size: 'lg' }, '')
      expect(unsupported).not.toContain('partner-compound-loud-lg')
      expect(pipeline('div', { tone: 'calm', size: 'lg' }, '')).toContain(
        'partner-compound-calm-lg',
      )
    })

    it('keeps a partner compound on a compatible variant', () => {
      const pipeline = make([{ size: 'sm', class: 'partner-compound-sm' }])

      expect(pipeline('div', { size: 'sm' }, '')).toContain('partner-compound-sm')
    })

    it('never filters a primary compound on the incompatible variant', () => {
      const pipeline = make([])

      expect(pipeline('div', { tone: 'bold' }, '')).toContain('primary-compound-bold')
    })
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
