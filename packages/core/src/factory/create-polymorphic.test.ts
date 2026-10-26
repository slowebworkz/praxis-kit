import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CollectingReporter,
  DefaultPolicy,
  Diagnostics,
  Severity,
  silentDiagnostics,
} from '@praxis-kit/diagnostics'
import { createPolymorphic } from './create-polymorphic'
import type { AnyRecord } from '../types'
import type { ClassPluginFactory } from '@praxis-kit/styling'

function makeCollecting() {
  const reporter = new CollectingReporter()
  const diagnostics = new Diagnostics(
    reporter,
    new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
  )
  return { reporter, diagnostics }
}

// Contract tests for the pipeline-based PolymorphicRuntime.
//
// These tests verify the public runtime behavior independently of the original implementation.
// They also cover runtime capabilities introduced by the pipeline architecture, including HTML
// prop normalizers and built-in HTML children evaluators.

// ---------------------------------------------------------------------------
// resolveTag / resolveProps
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveTag()', () => {
  it('returns defaultTag when no as provided', () => {
    const runtime = createPolymorphic({ tag: 'section' })
    expect(runtime.resolveTag()).toBe('section')
  })

  it('returns as when provided', () => {
    const runtime = createPolymorphic({ tag: 'div' })
    expect(runtime.resolveTag('article')).toBe('article')
  })
})

describe('createPolymorphic — resolveProps()', () => {
  it('returns instance props unchanged when no defaults configured', () => {
    const runtime = createPolymorphic({})
    expect(runtime.resolveProps({ className: 'foo' })).toEqual({ className: 'foo' })
  })

  it('fills in defaults that are missing from instance props', () => {
    const runtime = createPolymorphic({ defaults: { 'data-testid': 'card' } as never })
    expect(runtime.resolveProps({})).toMatchObject({ 'data-testid': 'card' })
  })
})

// ---------------------------------------------------------------------------
// resolveClasses
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveClasses()', () => {
  it('constructs the optional composition resolver in the core runtime', () => {
    const partner = () => null
    Object.defineProperty(partner, Symbol.for('@praxis-kit/composition-style-metadata'), {
      value: {
        baseClassName: 'partner-base',
        variants: { tone: { quiet: 'partner-quiet' } },
      },
    })

    const runtime = createPolymorphic({
      styling: { base: 'primary-base' },
      compose: { with: partner as never },
    })

    expect(runtime.compositionClassResolver?.('div', { tone: 'quiet' })).toContain('partner-base')
    expect(runtime.compositionClassResolver?.('div', { tone: 'quiet' })).toContain('primary-base')
    expect(runtime.compositionClassResolver?.('div', { tone: 'quiet' })).toContain('partner-quiet')
  })

  it('reports an incompatible composed variant through the runtime diagnostics, with the component name', () => {
    const { reporter, diagnostics } = makeCollecting()
    const partner = () => null
    Object.defineProperty(partner, Symbol.for('@praxis-kit/composition-style-metadata'), {
      value: { variants: { tone: { quiet: 'partner-quiet', loud: 'partner-loud' } } },
    })

    createPolymorphic({
      name: 'Card',
      enforcement: { diagnostics },
      styling: { variants: { tone: { calm: 'primary-calm', bold: 'primary-bold' } } },
      compose: { with: partner as never },
    })

    const collisions = reporter.diagnostics.filter((d) => d.code === 'COMP1014')
    expect(collisions).toHaveLength(1)
    expect(collisions[0]?.message).toContain('Incompatible composed variant "tone"')
    expect(collisions[0]?.component).toBe('Card')
  })

  it('does not construct a composition resolver without a target', () => {
    const runtime = createPolymorphic({ styling: { base: 'base' } })
    expect(runtime.compositionClassResolver).toBeUndefined()
  })

  it('returns base class', () => {
    const runtime = createPolymorphic({ styling: { base: 'rounded-lg' } })
    expect(runtime.resolveClasses('div', {})).toContain('rounded-lg')
  })

  it('applies variant classes', () => {
    const runtime = createPolymorphic({
      styling: {
        base: 'base',
        variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
        defaults: { size: 'sm' },
      },
    })
    expect(runtime.resolveClasses('div', { size: 'lg' })).toContain('text-lg')
  })
})

// ---------------------------------------------------------------------------
// resolveAria
// ---------------------------------------------------------------------------

describe('createPolymorphic — resolveAria()', () => {
  it('passes props through unchanged when no enforcement config', () => {
    const runtime = createPolymorphic({ tag: 'button' })
    const props = { 'aria-checked': 'true' }
    expect(runtime.resolveAria('button', props).props).toMatchObject({ 'aria-checked': 'true' })
  })

  it('forwards ancestor context through the factory runtime to implicit-role evaluation', () => {
    const redundantRoleCodes = (ariaOptions?: { ancestorTags: ['main'] }) => {
      const { reporter, diagnostics } = makeCollecting()
      const runtime = createPolymorphic({ tag: 'header', enforcement: { diagnostics } })
      runtime.resolveAria('header', { role: 'banner' }, undefined, ariaOptions)
      return reporter.diagnostics.map((d) => d.code)
    }

    // A top-level header has the implicit banner role, so an explicit banner is redundant.
    expect(redundantRoleCodes()).toContain('HTML3003')

    // Inside a landmark context the implicit role is generic, so banner is no longer reported as
    // redundant. (It is still not a permitted role for a nested header, hence other diagnostics.)
    // The fourth argument carries the same optional ancestry accepted by the engine.
    expect(redundantRoleCodes({ ancestorTags: ['main'] })).not.toContain('HTML3003')
  })

  it('strips an invalid aria-* attribute for the effective role when enforcement is declared', () => {
    const runtime = createPolymorphic({
      tag: 'button',
      enforcement: { diagnostics: silentDiagnostics },
    })
    // aria-checked is not valid on role="button"
    const result = runtime.resolveAria('button', { 'aria-checked': 'true' })
    expect(result.props).not.toHaveProperty('aria-checked')
  })

  // enforcement.rules exists for rules with no relationship to ARIA (e.g. a dangerous-URL-scheme
  // security guard) that still need AriaPolicyEngine's fix machinery, without having to sit under
  // the misleadingly-named `aria` bucket to get it.
  it('runs an enforcement.rules fix for a roleless tag (no relationship to ARIA)', () => {
    const stripDataUnsafe = Object.assign(
      (ctx: { props: AnyRecord }) => {
        if (!('data-unsafe' in ctx.props)) return [{ valid: true as const }]
        return [
          {
            valid: false as const,
            severity: 'error' as const,
            fixable: true as const,
            fix: {
              kind: 'removeAttribute' as const,
              attribute: 'data-unsafe',
              apply: ({ props }: { props: AnyRecord }) => {
                const { 'data-unsafe': _omit, ...rest } = props
                return { applied: true as const, next: rest, previous: props }
              },
            },
          },
        ]
      },
      { readsProps: ['data-unsafe'] as const },
    )
    // 'span' has no implicit role and no explicit role prop — the exact "roleless" case
    // enforcement.rules must still run for (see finding #14).
    const runtime = createPolymorphic({
      tag: 'span',
      enforcement: { diagnostics: silentDiagnostics, rules: [stripDataUnsafe] },
    })
    const result = runtime.resolveAria('span', { 'data-unsafe': 'x' })
    expect(result.props).not.toHaveProperty('data-unsafe')
  })

  it('merges enforcement.aria and enforcement.rules — both run', () => {
    const failAria = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        fixable: false as const,
        message: 'A',
      },
    ]
    const failRule = () => [
      {
        valid: false as const,
        severity: 'warning' as const,
        fixable: false as const,
        message: 'B',
      },
    ]
    const { reporter, diagnostics } = makeCollecting()
    const runtime = createPolymorphic({
      tag: 'button',
      enforcement: { diagnostics, aria: [failAria], rules: [failRule] },
    })
    runtime.resolveAria('button', {})
    const messages = reporter.diagnostics.map((d) => d.message)
    expect(messages).toContain('A')
    expect(messages).toContain('B')
  })
})

// ---------------------------------------------------------------------------
// options
// ---------------------------------------------------------------------------

describe('createPolymorphic — options', () => {
  it('exposes frozen runtime options', () => {
    const runtime = createPolymorphic({ tag: 'section' })
    expect(runtime.options.defaultTag).toBe('section')
    expect(Object.isFrozen(runtime.options)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// plugin contract — resolveClassPlugin wiring
// ---------------------------------------------------------------------------

describe('createPolymorphic — plugin contract', () => {
  it('accepts a well-formed plugin factory and sets hasStyling/classPlugin', () => {
    const runtime = createPolymorphic({
      styling: {
        plugin: () => ({
          pipeline: (_tag, _props, cls) => (Array.isArray(cls) ? cls.join(' ') : (cls ?? '')),
        }),
      },
    })
    expect(runtime).toMatchObject({ hasStyling: true })
    expect('classPlugin' in runtime).toBe(true)
  })

  it('throws at factory time when the plugin factory returns null', () => {
    expect(() => createPolymorphic({ styling: { plugin: () => null as never } })).toThrow(
      "Plugin factory must return an object with a 'pipeline' function. Got: null.",
    )
  })

  it("uses the plugin's pipeline to resolve classes", () => {
    const runtime = createPolymorphic({
      styling: { plugin: () => ({ pipeline: () => 'plugin-output' }) },
    })
    expect(runtime.resolveClasses('div', {})).toBe('plugin-output')
  })
})

// ---------------------------------------------------------------------------
// Built-in HTML prop normalizers
// ---------------------------------------------------------------------------

describe('createPolymorphic — options.htmlPropNormalizersFn', () => {
  it('is present regardless of enforcement config', () => {
    const runtime = createPolymorphic({})
    expect(typeof runtime.options.htmlPropNormalizersFn).toBe('function')
  })

  it('returns built-in normalizers for a form tag', () => {
    const runtime = createPolymorphic({})
    const normalizers = runtime.options.htmlPropNormalizersFn?.('button')
    expect(normalizers?.length).toBeGreaterThan(0)
  })

  it('returns undefined for a tag with no built-in normalizers', () => {
    const runtime = createPolymorphic({})
    expect(runtime.options.htmlPropNormalizersFn?.('div')).toBeUndefined()
  })

  it('applying the disabled-button normalizer adds aria-disabled', () => {
    const runtime = createPolymorphic({})
    const normalizers = runtime.options.htmlPropNormalizersFn?.('button') ?? []
    const patched = normalizers.reduce((acc, fn) => ({ ...acc, ...fn(acc) }), { disabled: true })
    expect(patched).toMatchObject({ 'aria-disabled': 'true' })
  })
})

// ---------------------------------------------------------------------------
// Built-in HTML children evaluators
// ---------------------------------------------------------------------------

describe('createPolymorphic — options.htmlChildrenEvaluatorFn', () => {
  it('is present regardless of enforcement config', () => {
    const runtime = createPolymorphic({})
    expect(typeof runtime.options.htmlChildrenEvaluatorFn).toBe('function')
  })

  it('returns a children evaluator for a tag with a built-in content-model contract', () => {
    const runtime = createPolymorphic({})
    const evaluator = runtime.options.htmlChildrenEvaluatorFn?.('picture')
    expect(evaluator).toBeDefined()
  })

  it('returns undefined for a tag with no built-in content-model contract', () => {
    const runtime = createPolymorphic({})
    expect(runtime.options.htmlChildrenEvaluatorFn?.('div')).toBeUndefined()
  })

  it('flags an invalid child against the built-in contract when evaluated', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const runtime = createPolymorphic({})
    // <picture> requires source*, then exactly one <img> — a bare <div> violates that.
    runtime.options.htmlChildrenEvaluatorFn?.('picture')?.evaluate([{ type: 'div' }])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('createPolymorphic — composition plugin selection', () => {
  const metadataKey = Symbol.for('@praxis-kit/composition-style-metadata')

  // Cast through the real factory type: `as never` would make `createPolymorphic` infer `never`.
  const asPlugin = (factory: unknown) => factory as ClassPluginFactory

  function partnerWith(pluginFactory?: unknown) {
    const partner = () => null
    Object.defineProperty(partner, metadataKey, {
      value: {
        baseClassName: 'partner-base',
        ...(pluginFactory !== undefined && { pluginFactory }),
      },
    })
    return partner
  }

  const pluginA = vi.fn((options: { baseClassName?: string }) => ({
    pipeline: () => `plugin-a:${options.baseClassName ?? ''}`,
    ownedKeys: new Set(['flex']),
  }))
  const pluginB = vi.fn(() => ({ pipeline: () => 'plugin-b' }))

  beforeEach(() => {
    pluginA.mockClear()
    pluginB.mockClear()
  })

  it('selects the primary factory and passes merged styling options', () => {
    const runtime = createPolymorphic({
      styling: { base: 'primary-base', plugin: asPlugin(pluginA) },
      compose: { with: partnerWith(pluginB) as never },
    })

    expect(pluginA).toHaveBeenCalledTimes(2)
    expect(pluginA.mock.calls[1]?.[0].baseClassName).toBe('partner-base primary-base')
    expect(pluginB).not.toHaveBeenCalled()
    expect(runtime.compositionClassResolver?.('div', {})).toBe('plugin-a:partner-base primary-base')
    expect(runtime.compositionClassResolver?.ownedKeys).toEqual(new Set(['flex']))
  })

  it('selects a primary-only factory when the partner has none', () => {
    const runtime = createPolymorphic({
      styling: { base: 'primary-base', plugin: asPlugin(pluginA) },
      compose: { with: partnerWith() as never },
    })

    expect(pluginA).toHaveBeenCalledTimes(2)
    expect(runtime.compositionClassResolver?.('div', {})).toBe('plugin-a:partner-base primary-base')
  })

  it('selects the partner factory when the primary has none', () => {
    const runtime = createPolymorphic({
      styling: { base: 'primary-base' },
      compose: { with: partnerWith(pluginB) as never },
    })

    expect(pluginB).toHaveBeenCalledTimes(1)
    expect(runtime.compositionClassResolver?.('div', {})).toBe('plugin-b')
  })

  it('instantiates a shared factory once for the composition pipeline', () => {
    const shared = vi.fn(() => ({ pipeline: () => 'shared' }))
    const runtime = createPolymorphic({
      styling: { plugin: asPlugin(shared) },
      compose: { with: partnerWith(shared) as never },
    })

    // One standalone pipeline and one merged composition pipeline. The shared factory is not
    // invoked separately for the primary and partner within composition.
    expect(shared).toHaveBeenCalledTimes(2)
    expect(runtime.compositionClassResolver?.('div', {})).toBe('shared')
  })

  it('warns with COMP1016 and keeps the primary factory when factories conflict', () => {
    const { reporter, diagnostics } = makeCollecting()
    const runtime = createPolymorphic({
      name: 'Composed',
      enforcement: { diagnostics },
      styling: { plugin: asPlugin(pluginA) },
      compose: { with: partnerWith(pluginB) as never },
    })

    const conflicts = reporter.diagnostics.filter((diagnostic) => diagnostic.code === 'COMP1016')
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.component).toBe('Composed')
    expect(pluginB).not.toHaveBeenCalled()
    expect(runtime.compositionClassResolver?.('div', {})).toContain('plugin-a:')
  })

  it('uses the default class pipeline when neither contract declares a plugin', () => {
    const runtime = createPolymorphic({
      styling: { base: 'primary-base' },
      compose: { with: partnerWith() as never },
    })

    expect(runtime.compositionClassResolver?.('div', {})).toBe('partner-base primary-base')
    expect(runtime.compositionClassResolver?.ownedKeys).toEqual(new Set())
  })

  it('does not activate composition for an external partner without retained metadata', () => {
    const runtime = createPolymorphic({
      styling: { plugin: asPlugin(pluginA) },
      compose: { with: (() => null) as never },
    })

    expect(runtime.compositionClassResolver).toBeUndefined()
  })
})
