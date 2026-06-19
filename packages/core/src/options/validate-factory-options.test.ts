import { describe, expect, it, vi, afterEach } from 'vitest'

import type { ResolvedFactoryOptions } from '../types'
import { validateFactoryOptions } from './validate-factory-options'

afterEach(() => {
  vi.restoreAllMocks()
})

// The validator exists for untyped/cast consumers, so the tests construct
// resolved-options shapes directly and cast past the typed surface.
function resolved(over: Record<string, unknown>): ResolvedFactoryOptions {
  return {
    defaultTag: 'div',
    displayName: 'Box',
    strict: 'warn',
    variantKeys: new Set<string>(),
    ...over,
  } as unknown as ResolvedFactoryOptions
}

const SIZE = { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } }

describe('validateFactoryOptions — preset selections', () => {
  it('warns when a preset references an unknown variant key', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateFactoryOptions(resolved({ ...SIZE, recipeMap: { p: { intent: 'primary' } } }))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown variant "intent"'))
  })

  it('warns when a preset references an unknown value of a known variant', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateFactoryOptions(resolved({ ...SIZE, recipeMap: { p: { size: 'xl' } } }))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown value "xl"'))
  })

  it('does not warn for a valid preset selection', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateFactoryOptions(resolved({ ...SIZE, recipeMap: { p: { size: 'lg' } } }))
    expect(warn).not.toHaveBeenCalled()
  })

  it('names the offending preset in the message', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateFactoryOptions(resolved({ ...SIZE, recipeMap: { compact: { size: 'xl' } } }))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('preset "compact"'))
  })
})

describe('validateFactoryOptions — defaults', () => {
  it('warns when defaults reference an unknown value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateFactoryOptions(resolved({ ...SIZE, defaultVariants: { size: 'xl' } }))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('defaults'))
  })

  it('does not warn for valid defaults', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateFactoryOptions(resolved({ ...SIZE, defaultVariants: { size: 'sm' } }))
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('validateFactoryOptions — strict gating', () => {
  it('throws under strict: "throw"', () => {
    expect(() =>
      validateFactoryOptions(
        resolved({ ...SIZE, strict: 'throw', recipeMap: { p: { size: 'xl' } } }),
      ),
    ).toThrow(/unknown value "xl"/)
  })

  it('throws under strict: true', () => {
    expect(() =>
      validateFactoryOptions(resolved({ ...SIZE, strict: true, recipeMap: { p: { bad: 'x' } } })),
    ).toThrow(/unknown variant "bad"/)
  })

  it('is silent under strict: false even with an invalid preset', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      validateFactoryOptions(
        resolved({ ...SIZE, strict: false, recipeMap: { p: { size: 'xl' } } }),
      ),
    ).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('validateFactoryOptions — edge cases', () => {
  it('reports unknown variant when no variants are declared at all', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateFactoryOptions(resolved({ recipeMap: { p: { size: 'sm' } } }))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown variant "size"'))
  })

  it('is a no-op when there are no presets or defaults', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateFactoryOptions(resolved({ ...SIZE }))
    expect(warn).not.toHaveBeenCalled()
  })

  it('reports prototype-inherited keys as unknown variants', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateFactoryOptions(resolved({ ...SIZE, recipeMap: { p: { toString: 'sm' } } }))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown variant "toString"'))
  })

  it('accepts a boolean value when the matching string key is declared', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateFactoryOptions(
      resolved({
        variants: { disabled: { true: 'opacity-50', false: '' } },
        defaultVariants: { disabled: true },
      }),
    )
    expect(warn).not.toHaveBeenCalled()
  })

  it('skips null and undefined values in selections without reporting', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateFactoryOptions(resolved({ ...SIZE, defaultVariants: { size: null } }))
    validateFactoryOptions(resolved({ ...SIZE, defaultVariants: { size: undefined } }))
    expect(warn).not.toHaveBeenCalled()
  })
})

describe("validateFactoryOptions — strict: 'async-warn'", () => {
  it('warns synchronously (construction-time warnings are one-shot, no deferral needed)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    validateFactoryOptions(
      resolved({ ...SIZE, strict: 'async-warn', recipeMap: { p: { intent: 'primary' } } }),
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown variant "intent"'))
  })

  it('does not throw', () => {
    expect(() =>
      validateFactoryOptions(
        resolved({ ...SIZE, strict: 'async-warn', recipeMap: { p: { intent: 'primary' } } }),
      ),
    ).not.toThrow()
  })
})
