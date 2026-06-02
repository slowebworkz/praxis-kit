import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import { validateRenderProps, _resetWarned } from './validate-render-props'

const variants = {
  size: { sm: 'text-sm', md: 'text-base', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

const presetMap = { cta: { intent: 'primary' }, subtle: { intent: 'ghost' } }

beforeEach(() => {
  _resetWarned()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('validateRenderProps — strict: false', () => {
  it('is completely silent regardless of violations', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: false, variants, presetMap }, { size: 'enormous' }, 'nonexistent')
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('validateRenderProps — unknown presetKey', () => {
  it('warns when presetKey names no defined preset (strict: warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants, presetMap }, {}, 'unknown')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/unknown presetKey "unknown"/i)
  })

  it('throws when presetKey names no defined preset (strict: throw)', () => {
    expect(() =>
      validateRenderProps({ strict: 'throw', variants, presetMap }, {}, 'unknown'),
    ).toThrow(/unknown presetKey "unknown"/i)
  })

  it('is silent when presetKey is undefined', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants, presetMap }, {}, undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when presetKey matches a defined preset', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants, presetMap }, {}, 'cta')
    expect(warn).not.toHaveBeenCalled()
  })

  it('includes component name in the message when displayName is set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps(
      { strict: 'warn', variants, presetMap, displayName: 'Button' },
      {},
      'unknown',
    )
    expect(warn.mock.calls[0]![0]).toMatch(/\[Button\]/)
  })

  it('does not repeat the same warning on subsequent renders', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants, presetMap }, {}, 'unknown')
    validateRenderProps({ strict: 'warn', variants, presetMap }, {}, 'unknown')
    validateRenderProps({ strict: 'warn', variants, presetMap }, {}, 'unknown')
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('validateRenderProps — undefined variant value', () => {
  it('warns when a known variant dimension receives an undefined value (strict: warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants }, { size: 'enormous' }, undefined)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/size=enormous/i)
  })

  it('throws when a known variant dimension receives an undefined value (strict: throw)', () => {
    expect(() =>
      validateRenderProps({ strict: 'throw', variants }, { size: 'enormous' }, undefined),
    ).toThrow(/size=enormous/i)
  })

  it('is silent when all variant props have valid values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants }, { size: 'sm', intent: 'primary' }, undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when variant props are omitted (defaults apply)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants }, {}, undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when variant prop value is null or undefined (treated as unset)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants }, { size: null, intent: undefined }, undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when no variants are defined on the component', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn' }, { size: 'enormous' }, undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('does not repeat the same warning on subsequent renders', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants }, { size: 'enormous' }, undefined)
    validateRenderProps({ strict: 'warn', variants }, { size: 'enormous' }, undefined)
    validateRenderProps({ strict: 'warn', variants }, { size: 'enormous' }, undefined)
    expect(warn).toHaveBeenCalledOnce()
  })
})
