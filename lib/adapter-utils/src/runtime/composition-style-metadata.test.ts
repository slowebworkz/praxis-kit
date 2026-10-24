import { describe, expect, it, vi } from 'vitest'
import { createPolymorphic } from '@praxis-kit/core'
import type { ClassPluginFactory, EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import { buildCoreRuntime } from './build-core-runtime'
import {
  attachCompositionStyleMetadata,
  composeStyleProps,
  filterOwnedProps,
  createOptionalCompositionStylePipeline,
  getCompositionStyleMetadata,
} from './composition-style-metadata'

type ButtonGenerics = PolymorphicGenerics<'button', EmptyRecord, EmptyRecord, EmptyRecord>

describe('composition style metadata', () => {
  it('retains the original plugin factory separately from normalized styling options', () => {
    // Cast through the real factory type: `as never` would make `createPolymorphic` infer `never`.
    const pluginFactory = vi.fn(() => ({
      pipeline: () => 'plugin-output',
    })) as unknown as ClassPluginFactory
    const runtime = createPolymorphic({ styling: { base: 'base', plugin: pluginFactory } })
    const component = () => {}

    attachCompositionStyleMetadata(component, runtime.options, pluginFactory)

    expect(getCompositionStyleMetadata(component)).toMatchObject({
      baseClassName: 'base',
      pluginFactory,
    })
  })

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
      { variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } } },
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
      { variants: { intent: { quiet: 'partner-quiet' } } },
    )

    expect(result).toEqual({ intent: 'primary', size: 'lg' })
  })

  it('includes explicitly selected partner-only variants even when raw props are not forwarded', () => {
    const result = composeStyleProps(
      {},
      { tone: 'loud', unrelated: 'not-a-variant' },
      primary,
      undefined,
      { variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } } },
    )

    expect(result).toEqual({ tone: 'loud' })
  })
})

describe('composition-owned props', () => {
  it('passes owned props to composition styling when allProps forwarding is disabled', () => {
    const ownedKeys = new Set(['flex', 'grid'])
    const defaults = { flex: true, grid: false }

    expect(composeStyleProps({}, { flex: false }, {}, defaults, {}, ownedKeys)).toEqual({
      flex: false,
      grid: false,
    })
  })

  it('uses compose.defaults for owned props when there is no explicit selection', () => {
    const ownedKeys = new Set(['flex'])

    expect(composeStyleProps({}, {}, {}, { flex: true }, {}, ownedKeys)).toEqual({ flex: true })
  })

  it('filters owned props before child or host forwarding', () => {
    expect(
      filterOwnedProps(
        { flex: true, grid: false, id: 'button', 'data-testid': 'primary' },
        new Set(['flex', 'grid']),
      ),
    ).toEqual({ id: 'button', 'data-testid': 'primary' })
  })

  it('also omits caller-specified props before forwarding', () => {
    expect(filterOwnedProps({ as: 'article', id: 'card' }, new Set(), ['as'])).toEqual({
      id: 'card',
    })
  })
})

describe('composeStyleProps — undefined selections', () => {
  const primary = { variants: { size: { sm: 'small', lg: 'large' } } }
  const partner = { variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } } }

  it('does not pin a variant to undefined, so recipes and defaults can still supply it', () => {
    const result = composeStyleProps(
      {},
      { tone: undefined, size: undefined },
      primary,
      undefined,
      partner,
    )

    expect(result).toEqual({})
    expect('tone' in result).toBe(false)
    expect('size' in result).toBe(false)
  })

  it('removes an undefined declared-variant value already present in partnerProps', () => {
    const result = composeStyleProps(
      { tone: undefined, size: undefined, 'data-probe': 'kept' },
      {},
      primary,
      undefined,
      partner,
    )

    expect('tone' in result).toBe(false)
    expect('size' in result).toBe(false)
    expect(result).toEqual({ 'data-probe': 'kept' })
  })

  it('lets a recipe supply a variant that partnerProps carries as undefined', () => {
    const resolveClasses = createOptionalCompositionStylePipeline({
      primary: { baseClassName: 'primary-base' },
      with: attachCompositionStyleMetadata(() => null, {
        variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
        recipeMap: { emphasis: { tone: 'loud' } },
      }),
    })

    const props = composeStyleProps(
      { tone: undefined },
      {},
      { baseClassName: 'primary-base' },
      undefined,
      resolveClasses!.partner,
    )

    expect(resolveClasses?.('div', props, undefined, 'emphasis')).toContain('partner-loud')
  })

  it('keeps a defined partnerProps variant, which is an explicit selection', () => {
    const result = composeStyleProps({ tone: 'quiet' }, {}, primary, undefined, partner)

    expect(result).toEqual({ tone: 'quiet' })
  })

  it('still copies a defined selection', () => {
    const result = composeStyleProps({}, { tone: 'loud', size: 'lg' }, primary, undefined, partner)

    expect(result).toEqual({ tone: 'loud', size: 'lg' })
  })
})

describe('composition recipe and default precedence', () => {
  // Draft precedence: explicit props > recipe values > primary defaults > compose.defaults >
  // partner defaults. Resolved through the real shared resolver, not a mock.
  const partnerMetadata = {
    variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } },
    defaultVariants: { tone: 'quiet' as const },
    recipeMap: { emphasis: { tone: 'loud' as const } },
  }
  const primary = { baseClassName: 'primary-base' }

  function resolve(
    options: { composeDefaults?: object; primaryDefaults?: Record<string, string> },
    selection: Record<string, unknown>,
    recipe?: string,
  ): string | undefined {
    const primaryStyle = {
      ...primary,
      ...(options.primaryDefaults && { defaultVariants: options.primaryDefaults }),
    }
    const resolver = createOptionalCompositionStylePipeline({
      primary: primaryStyle,
      with: attachCompositionStyleMetadata(() => null, partnerMetadata),
      ...(options.composeDefaults && { composeDefaults: options.composeDefaults }),
    })
    const props = composeStyleProps(
      {},
      selection,
      primaryStyle,
      options.composeDefaults,
      resolver!.partner,
    )
    return resolver?.('div', props, undefined, recipe)
  }

  it('applies compose.defaults over the partner’s own defaults', () => {
    expect(resolve({ composeDefaults: { tone: 'loud' } }, {})).toContain('partner-loud')
  })

  it('lets a primary default beat compose.defaults when nothing else selects the variant', () => {
    // partner default: quiet, compose.defaults: loud, primary default: quiet.
    const className = resolve(
      { composeDefaults: { tone: 'loud' }, primaryDefaults: { tone: 'quiet' } },
      {},
    )

    expect(className).toContain('partner-quiet')
    expect(className).not.toContain('partner-loud')
  })

  it('lets a primary default beat both compose.defaults and the partner’s own default', () => {
    // partner default: quiet, compose.defaults: quiet, primary default: loud — only the primary
    // default can explain a `loud` result.
    const className = resolve(
      { composeDefaults: { tone: 'quiet' }, primaryDefaults: { tone: 'loud' } },
      {},
    )

    expect(className).toContain('partner-loud')
    expect(className).not.toContain('partner-quiet')
  })

  it('lets a recipe value beat a primary default', () => {
    const className = resolve({ primaryDefaults: { tone: 'quiet' } }, {}, 'emphasis')

    expect(className).toContain('partner-loud')
    expect(className).not.toContain('partner-quiet')
  })

  it('lets a recipe value beat compose.defaults', () => {
    expect(resolve({ composeDefaults: { tone: 'quiet' } }, {}, 'emphasis')).toContain(
      'partner-loud',
    )
  })

  it('lets an explicit selection beat both a recipe and compose.defaults', () => {
    const className = resolve({ composeDefaults: { tone: 'loud' } }, { tone: 'quiet' }, 'emphasis')

    expect(className).toContain('partner-quiet')
    expect(className).not.toContain('partner-loud')
  })

  it('does not let an explicit undefined selection pin the variant over a recipe', () => {
    expect(
      resolve({ composeDefaults: { tone: 'quiet' } }, { tone: undefined }, 'emphasis'),
    ).toContain('partner-loud')
  })

  it('falls back to compose.defaults when an explicit selection is undefined and there is no recipe', () => {
    expect(resolve({ composeDefaults: { tone: 'loud' } }, { tone: undefined })).toContain(
      'partner-loud',
    )
  })
})

describe('shared runtime composition integration', () => {
  it('constructs the optional resolver and reserves its owned keys at runtime construction', () => {
    const pluginFactory = ((options: { baseClassName?: string }) => ({
      pipeline: () => options.baseClassName ?? '',
      ownedKeys: new Set(options.baseClassName?.includes('partner-base') ? ['grid'] : ['flex']),
    })) as never
    const partner = attachCompositionStyleMetadata(() => null, {
      baseClassName: 'partner-base',
    })

    const built = buildCoreRuntime<ButtonGenerics>({
      tag: 'button',
      styling: {
        base: 'primary-base',
        plugin: pluginFactory,
      },
      compose: { with: partner as never, defaults: { tone: 'quiet' } },
    })

    expect(built.compositionClassResolver?.('button', {})).toBe('partner-base primary-base')
    expect(built.ownedKeys).toEqual(new Set(['flex', 'grid']))
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
    expect(resolveClasses?.partner).toEqual({ baseClassName: 'partner-base' })
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
