import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import type { MockInstance } from 'vitest'
import { validateRenderProps, _resetWarned } from './validate-render-props'

const variants = {
  size: { sm: 'text-sm', md: 'text-base', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

const recipeMap = { cta: { intent: 'primary' }, subtle: { intent: 'ghost' } }

let warn: MockInstance

beforeEach(() => {
  _resetWarned()
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('validateRenderProps — strict: false', () => {
  it('is completely silent regardless of violations', () => {
    validateRenderProps({ strict: false, variants, recipeMap }, { size: 'enormous' }, 'nonexistent')
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('validateRenderProps — unknown recipeKey', () => {
  it('warns when recipeKey names no defined preset (strict: warn)', () => {
    validateRenderProps({ strict: 'warn', variants, recipeMap }, {}, 'unknown')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/unknown recipeKey "unknown"/i)
  })

  it('throws when recipeKey names no defined preset (strict: throw)', () => {
    expect(() =>
      validateRenderProps({ strict: 'throw', variants, recipeMap }, {}, 'unknown'),
    ).toThrow(/unknown recipeKey "unknown"/i)
  })

  it('is silent when recipeKey is undefined', () => {
    validateRenderProps({ strict: 'warn', variants, recipeMap }, {}, undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when recipeKey matches a defined preset', () => {
    validateRenderProps({ strict: 'warn', variants, recipeMap }, {}, 'cta')
    expect(warn).not.toHaveBeenCalled()
  })

  it('includes component name in the message when displayName is set', () => {
    validateRenderProps(
      { strict: 'warn', variants, recipeMap, displayName: 'Button' },
      {},
      'unknown',
    )
    expect(warn.mock.calls[0]![0]).toMatch(/\[Button\]/)
  })

  it('does not repeat the same warning on subsequent renders', () => {
    validateRenderProps({ strict: 'warn', variants, recipeMap }, {}, 'unknown')
    validateRenderProps({ strict: 'warn', variants, recipeMap }, {}, 'unknown')
    validateRenderProps({ strict: 'warn', variants, recipeMap }, {}, 'unknown')
    expect(warn).toHaveBeenCalledOnce()
  })

  it('does not treat inherited properties as valid presets', () => {
    const inherited = Object.create({ inheritedPreset: {} }) as Record<string, unknown>
    validateRenderProps({ strict: 'warn', variants, recipeMap: inherited }, {}, 'inheritedPreset')
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('validateRenderProps — invalid variant value', () => {
  it('warns when a known variant dimension receives an invalid value (strict: warn)', () => {
    validateRenderProps({ strict: 'warn', variants }, { size: 'enormous' }, undefined)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/size=enormous/i)
  })

  it('throws when a known variant dimension receives an invalid value (strict: throw)', () => {
    expect(() =>
      validateRenderProps({ strict: 'throw', variants }, { size: 'enormous' }, undefined),
    ).toThrow(/size=enormous/i)
  })

  it('is silent when all variant props have valid values', () => {
    validateRenderProps({ strict: 'warn', variants }, { size: 'sm', intent: 'primary' }, undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when variant props are omitted (defaults apply)', () => {
    validateRenderProps({ strict: 'warn', variants }, {}, undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when variant prop value is null or undefined (treated as unset)', () => {
    validateRenderProps({ strict: 'warn', variants }, { size: null, intent: undefined }, undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when no variants are defined on the component', () => {
    validateRenderProps({ strict: 'warn' }, { size: 'enormous' }, undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('does not repeat the same warning on subsequent renders', () => {
    validateRenderProps({ strict: 'warn', variants }, { size: 'enormous' }, undefined)
    validateRenderProps({ strict: 'warn', variants }, { size: 'enormous' }, undefined)
    validateRenderProps({ strict: 'warn', variants }, { size: 'enormous' }, undefined)
    expect(warn).toHaveBeenCalledOnce()
  })

  it('does not dedupe distinct warnings', () => {
    validateRenderProps({ strict: 'warn', variants }, { size: 'enormous' }, undefined)
    validateRenderProps({ strict: 'warn', variants }, { size: 'gigantic' }, undefined)
    expect(warn).toHaveBeenCalledTimes(2)
  })
})

describe('validateRenderProps — multiple violations', () => {
  it('reports both preset and variant violations in the same call', () => {
    validateRenderProps({ strict: 'warn', variants, recipeMap }, { size: 'enormous' }, 'unknown')
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('reports all invalid variant dimensions, not just the first', () => {
    validateRenderProps(
      { strict: 'warn', variants },
      { size: 'enormous', intent: 'mega-primary' },
      undefined,
    )
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('throws on preset violation before reaching variant violations (strict: throw)', () => {
    expect(() =>
      validateRenderProps(
        { strict: 'throw', variants, recipeMap },
        { size: 'enormous' },
        'unknown',
      ),
    ).toThrow(/unknown recipeKey "unknown"/i)
  })
})

describe('validateRenderProps — dedup scope', () => {
  it('distinct components with the same message both warn (no cross-component dedup)', () => {
    validateRenderProps(
      { strict: 'warn', variants, recipeMap, displayName: 'Button' },
      {},
      'unknown',
    )
    validateRenderProps({ strict: 'warn', variants, recipeMap, displayName: 'Card' }, {}, 'unknown')
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('different preset names each produce their own warning', () => {
    validateRenderProps({ strict: 'warn', variants, recipeMap }, {}, 'unknown1')
    validateRenderProps({ strict: 'warn', variants, recipeMap }, {}, 'unknown2')
    expect(warn).toHaveBeenCalledTimes(2)
  })
})

describe('validateRenderProps — runtime type bypass', () => {
  it('warns when a numeric value is passed for a string variant (strict: warn)', () => {
    validateRenderProps({ strict: 'warn', variants }, { size: 123 as never }, undefined)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/size=123/i)
  })
})

// async-warn uses queueMicrotask internally. Promise.resolve() also resolves
// in the microtask queue, so awaiting it flushes the pending warn batch.
// This is intentional — the contract is specifically microtask semantics.
describe("validateRenderProps — strict: 'async-warn'", () => {
  it('does not call console.warn synchronously', () => {
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown')
    expect(warn).not.toHaveBeenCalled()
  })

  it('calls console.warn after microtask flush', async () => {
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown')
    await Promise.resolve()
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/unknown recipeKey "unknown"/i)
  })

  it('deduplicates identical messages within the same tick', async () => {
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown')
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown')
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown')
    await Promise.resolve()
    expect(warn).toHaveBeenCalledOnce()
  })

  // Dedup is per-tick: after the microtask flushes, the same message can fire again.
  it('allows the same message to re-fire in a later tick', async () => {
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown')
    await Promise.resolve()
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown')
    await Promise.resolve()
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it('batches multiple distinct violations into one microtask flush with correct messages', async () => {
    validateRenderProps(
      { strict: 'async-warn', variants, recipeMap },
      { size: 'enormous' },
      'unknown',
    )
    expect(warn).not.toHaveBeenCalled()
    await Promise.resolve()
    expect(warn).toHaveBeenCalledTimes(2)
    const messages = warn.mock.calls.map((c) => c[0] as string)
    expect(messages.some((m) => /unknown recipeKey "unknown"/i.test(m))).toBe(true)
    expect(messages.some((m) => /size=enormous/i.test(m))).toBe(true)
  })

  it('batches three distinct messages without collapsing them', async () => {
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown1')
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown2')
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown3')
    await Promise.resolve()
    expect(warn).toHaveBeenCalledTimes(3)
  })

  it('deduplicates repeated messages while preserving distinct ones', async () => {
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown1')
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown1')
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown2')
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown2')
    validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown3')
    await Promise.resolve()
    expect(warn).toHaveBeenCalledTimes(3)
  })

  it('does not throw', () => {
    expect(() =>
      validateRenderProps({ strict: 'async-warn', variants, recipeMap }, {}, 'unknown'),
    ).not.toThrow()
  })
})
