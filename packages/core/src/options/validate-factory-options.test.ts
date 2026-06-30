import { describe, expect, it } from 'vitest'

import type { ResolvedFactoryOptions } from '../types'
import { validateFactoryOptions } from './validate-factory-options'
import {
  CollectingReporter,
  Diagnostics,
  DefaultPolicy,
  Severity,
  throwDiagnostics,
  silentDiagnostics,
} from '@praxis-kit/diagnostics'

// The validator exists for untyped/cast consumers, so the tests construct
// resolved-options shapes directly and cast past the typed surface.
function resolved(over: Record<string, unknown>): ResolvedFactoryOptions {
  return {
    defaultTag: 'div',
    displayName: 'Box',
    variantKeys: new Set<string>(),
    ...over,
  } as unknown as ResolvedFactoryOptions
}

const SIZE = { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } }

function makeCollecting() {
  const reporter = new CollectingReporter()
  const diagnostics = new Diagnostics(
    reporter,
    new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
  )
  return { reporter, diagnostics }
}

describe('validateFactoryOptions — preset selections', () => {
  it('warns when a preset references an unknown variant key', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateFactoryOptions(
      resolved({ ...SIZE, recipeMap: { p: { intent: 'primary' } } }),
      diagnostics,
    )
    expect(reporter.diagnostics.some((d) => d.message.includes('unknown variant "intent"'))).toBe(
      true,
    )
  })

  it('warns when a preset references an unknown value of a known variant', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateFactoryOptions(resolved({ ...SIZE, recipeMap: { p: { size: 'xl' } } }), diagnostics)
    expect(reporter.diagnostics.some((d) => d.message.includes('unknown value "xl"'))).toBe(true)
  })

  it('does not warn for a valid preset selection', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateFactoryOptions(resolved({ ...SIZE, recipeMap: { p: { size: 'lg' } } }), diagnostics)
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('names the offending preset in the message', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateFactoryOptions(
      resolved({ ...SIZE, recipeMap: { compact: { size: 'xl' } } }),
      diagnostics,
    )
    expect(reporter.diagnostics.some((d) => d.message.includes('preset "compact"'))).toBe(true)
  })
})

describe('validateFactoryOptions — defaults', () => {
  it('warns when defaults reference an unknown value', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateFactoryOptions(resolved({ ...SIZE, defaultVariants: { size: 'xl' } }), diagnostics)
    expect(reporter.diagnostics.some((d) => d.message.includes('defaults'))).toBe(true)
  })

  it('does not warn for valid defaults', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateFactoryOptions(resolved({ ...SIZE, defaultVariants: { size: 'sm' } }), diagnostics)
    expect(reporter.diagnostics).toHaveLength(0)
  })
})

describe('validateFactoryOptions — strict gating', () => {
  it('throws under throwDiagnostics', () => {
    expect(() =>
      validateFactoryOptions(
        resolved({ ...SIZE, recipeMap: { p: { size: 'xl' } } }),
        throwDiagnostics,
      ),
    ).toThrow(/unknown value "xl"/)
  })

  it('also throws for an unknown variant under throwDiagnostics', () => {
    expect(() =>
      validateFactoryOptions(
        resolved({ ...SIZE, recipeMap: { p: { bad: 'x' } } }),
        throwDiagnostics,
      ),
    ).toThrow(/unknown variant "bad"/)
  })

  it('is silent under silentDiagnostics even with an invalid preset', () => {
    expect(() =>
      validateFactoryOptions(
        resolved({ ...SIZE, recipeMap: { p: { size: 'xl' } } }),
        silentDiagnostics,
      ),
    ).not.toThrow()
  })
})

describe('validateFactoryOptions — edge cases', () => {
  it('reports unknown variant when no variants are declared at all', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateFactoryOptions(resolved({ recipeMap: { p: { size: 'sm' } } }), diagnostics)
    expect(reporter.diagnostics.some((d) => d.message.includes('unknown variant "size"'))).toBe(
      true,
    )
  })

  it('is a no-op when there are no presets or defaults', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateFactoryOptions(resolved({ ...SIZE }), diagnostics)
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('reports prototype-inherited keys as unknown variants', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateFactoryOptions(resolved({ ...SIZE, recipeMap: { p: { toString: 'sm' } } }), diagnostics)
    expect(reporter.diagnostics.some((d) => d.message.includes('unknown variant "toString"'))).toBe(
      true,
    )
  })

  it('accepts a boolean value when the matching string key is declared', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateFactoryOptions(
      resolved({
        variants: { disabled: { true: 'opacity-50', false: '' } },
        defaultVariants: { disabled: true },
      }),
      diagnostics,
    )
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('skips null and undefined values in selections without reporting', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateFactoryOptions(resolved({ ...SIZE, defaultVariants: { size: null } }), diagnostics)
    validateFactoryOptions(resolved({ ...SIZE, defaultVariants: { size: undefined } }), diagnostics)
    expect(reporter.diagnostics).toHaveLength(0)
  })
})

describe('validateFactoryOptions — warn diagnostics', () => {
  it('warns synchronously (construction-time warnings are one-shot, no deferral needed)', () => {
    const { reporter, diagnostics } = makeCollecting()
    validateFactoryOptions(
      resolved({ ...SIZE, recipeMap: { p: { intent: 'primary' } } }),
      diagnostics,
    )
    expect(reporter.diagnostics.some((d) => d.message.includes('unknown variant "intent"'))).toBe(
      true,
    )
  })

  it('does not throw', () => {
    const { diagnostics } = makeCollecting()
    expect(() =>
      validateFactoryOptions(
        resolved({ ...SIZE, recipeMap: { p: { intent: 'primary' } } }),
        diagnostics,
      ),
    ).not.toThrow()
  })
})
