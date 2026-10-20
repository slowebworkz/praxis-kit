import { describe, expect, it, vi } from 'vitest'
import { createPolymorphic } from '@praxis-kit/core'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import { buildCoreRuntime } from './build-core-runtime'
import {
  attachCompositionStyleMetadata,
  composeStyleProps,
  createOptionalCompositionStylePipeline,
  getCompositionStyleMetadata,
} from './composition-style-metadata'

type ButtonGenerics = PolymorphicGenerics<'button', EmptyRecord, EmptyRecord, EmptyRecord>

describe('composition style metadata', () => {
  it('retains standard resolved styling fields without exposing metadata as an enumerable property', () => {
    const runtime = createPolymorphic({
      tag: 'button',
      styling: {
        base: 'button-base',
        variants: { intent: { primary: 'button-primary', quiet: 'button-quiet' } },
        defaults: { intent: 'primary' },
        tags: { a: 'button-link' },
        presets: { compact: { intent: 'quiet' } },
      },
    })
    const component = () => {}

    attachCompositionStyleMetadata(component, runtime.options)

    expect(getCompositionStyleMetadata(component)).toEqual({
      baseClassName: 'button-base',
      variants: { intent: { primary: 'button-primary', quiet: 'button-quiet' } },
      defaultVariants: { intent: 'primary' },
      recipeMap: { compact: { intent: 'quiet' } },
      tagMap: { a: 'button-link' },
    })
    expect(
      Object.getOwnPropertyDescriptor(
        component,
        Symbol.for('@praxis-kit/composition-style-metadata'),
      )?.enumerable,
    ).toBe(false)
    expect(getCompositionStyleMetadata(() => {})).toBeUndefined()
    expect(getCompositionStyleMetadata(null)).toBeUndefined()
  })
})

describe('composeStyleProps', () => {
  const primary = {
    variants: {
      intent: { primary: 'primary-intent', quiet: 'quiet-intent' },
      size: { sm: 'small-size', lg: 'large-size' },
    },
  }

  it('preserves an explicitly forwarded prop even when it equals compose.defaults', () => {
    const defaults = { tone: 'quiet' }
    const result = composeStyleProps(
      { tone: 'quiet', size: 'lg' },
      { tone: 'quiet' },
      primary,
      defaults,
    )

    expect(result).toEqual({ tone: 'quiet', size: 'lg' })
  })

  it('uses an explicit primary variant value instead of compose.defaults', () => {
    const defaults = { intent: 'quiet' }
    const result = composeStyleProps(
      { intent: 'quiet', size: 'lg' },
      { intent: 'primary' },
      primary,
      defaults,
    )

    expect(result).toEqual({ intent: 'primary', size: 'lg' })
  })
})

describe('shared runtime composition integration', () => {
  it('constructs the optional resolver at runtime construction when a Praxis target is supplied', () => {
    const partner = attachCompositionStyleMetadata(() => null, {
      baseClassName: 'partner-base',
    })

    const built = buildCoreRuntime<ButtonGenerics>(
      { tag: 'button', styling: { base: 'primary-base' } },
      { with: partner, defaults: { tone: 'quiet' } },
    )

    expect(built.compositionClassResolver?.('button', {})).toBe('partner-base primary-base')
  })

  it('keeps the ordinary runtime path when no composition target is supplied', () => {
    const built = buildCoreRuntime<ButtonGenerics>({
      tag: 'button',
      styling: { base: 'primary-base' },
    })

    expect(built.compositionClassResolver).toBeUndefined()
    expect(built.runtime.resolveClasses('button', {})).toBe('primary-base')
  })
})

describe('optional composition style pipeline', () => {
  const primary = { baseClassName: 'primary-base' }

  // A fresh partner per test: attaching metadata mutates the target.
  function partnerWith(styling: Parameters<typeof attachCompositionStyleMetadata>[1]): () => null {
    return attachCompositionStyleMetadata(() => null, styling)
  }

  it('does not activate when compose.with is undefined', () => {
    expect(createOptionalCompositionStylePipeline({ primary, with: undefined })).toBeUndefined()
  })

  it('falls back when compose.with is not a Praxis component with styling metadata', () => {
    expect(createOptionalCompositionStylePipeline({ primary, with: () => null })).toBeUndefined()
  })

  it('builds the combined resolver when compose.with exposes Praxis styling metadata', () => {
    const resolveClasses = createOptionalCompositionStylePipeline({
      primary,
      with: partnerWith({ baseClassName: 'partner-base' }),
    })

    expect(resolveClasses).toBeTypeOf('function')
    expect(resolveClasses?.('div', {})).toBe('partner-base primary-base')
  })

  it('forwards composeDefaults for variants the partner declares', () => {
    const resolveClasses = createOptionalCompositionStylePipeline({
      primary,
      with: partnerWith({ variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } } }),
      composeDefaults: { tone: 'loud' },
    })

    expect(resolveClasses?.('div', {})).toContain('partner-loud')
    expect(resolveClasses?.('div', {})).not.toContain('partner-quiet')
  })

  it('reports an incompatible shared variant through onDiagnostic', () => {
    const onDiagnostic = vi.fn()

    createOptionalCompositionStylePipeline({
      primary: { variants: { tone: { calm: 'primary-calm', bold: 'primary-bold' } } },
      with: partnerWith({ variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } } }),
      onDiagnostic,
    })

    expect(onDiagnostic).toHaveBeenCalledTimes(1)
    expect(onDiagnostic).toHaveBeenCalledWith(
      expect.stringContaining('Incompatible composed variant "tone"'),
    )
  })

  it('rejects unknown option keys at the type level', () => {
    createOptionalCompositionStylePipeline({
      primary,
      with: undefined,
      // @ts-expect-error — a misspelled option must not be accepted silently
      composeDefault: { tone: 'loud' },
    })
  })
})
