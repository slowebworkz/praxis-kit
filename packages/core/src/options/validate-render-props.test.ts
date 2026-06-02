import { describe, expect, it, vi, afterEach } from 'vitest'
import { validateRenderProps } from './validate-render-props'

const variants = {
  size: { sm: 'text-sm', md: 'text-base', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

const variantKeys = new Set(['size', 'intent'])
const presetMap = { cta: { intent: 'primary' }, subtle: { intent: 'ghost' } }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('validateRenderProps — strict: false', () => {
  it('is completely silent regardless of violations', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps(
      { strict: false, variants, variantKeys, presetMap },
      { size: 'enormous' },
      'nonexistent',
    )
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('validateRenderProps — unknown variantKey', () => {
  it('warns when variantKey names no defined preset (strict: warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants, variantKeys, presetMap }, {}, 'unknown')
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/unknown variantKey "unknown"/i)
  })

  it('throws when variantKey names no defined preset (strict: throw)', () => {
    expect(() =>
      validateRenderProps({ strict: 'throw', variants, variantKeys, presetMap }, {}, 'unknown'),
    ).toThrow(/unknown variantKey "unknown"/i)
  })

  it('is silent when variantKey is undefined', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants, variantKeys, presetMap }, {}, undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when variantKey matches a defined preset', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants, variantKeys, presetMap }, {}, 'cta')
    expect(warn).not.toHaveBeenCalled()
  })

  it('includes component name in the message when displayName is set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps(
      { strict: 'warn', variants, variantKeys, presetMap, displayName: 'Button' },
      {},
      'unknown',
    )
    expect(warn.mock.calls[0]![0]).toMatch(/\[Button\]/)
  })
})

describe('validateRenderProps — undefined variant value', () => {
  it('warns when a known variant dimension receives an undefined value (strict: warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants, variantKeys }, { size: 'enormous' }, undefined)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]![0]).toMatch(/size=enormous/i)
  })

  it('throws when a known variant dimension receives an undefined value (strict: throw)', () => {
    expect(() =>
      validateRenderProps(
        { strict: 'throw', variants, variantKeys },
        { size: 'enormous' },
        undefined,
      ),
    ).toThrow(/size=enormous/i)
  })

  it('is silent when all variant props have valid values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps(
      { strict: 'warn', variants, variantKeys },
      { size: 'sm', intent: 'primary' },
      undefined,
    )
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when variant props are omitted (defaults apply)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variants, variantKeys }, {}, undefined)
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when variant prop value is null or undefined (treated as unset)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps(
      { strict: 'warn', variants, variantKeys },
      { size: null, intent: undefined },
      undefined,
    )
    expect(warn).not.toHaveBeenCalled()
  })

  it('is silent when no variants are defined on the component', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    validateRenderProps({ strict: 'warn', variantKeys: new Set() }, { size: 'enormous' }, undefined)
    expect(warn).not.toHaveBeenCalled()
  })
})
