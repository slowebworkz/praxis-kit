import { describe, it, expect } from 'vitest'
import { resolveAdapterCommonOptions } from './resolve-adapter-common-options'

describe('resolveAdapterCommonOptions — defaults', () => {
  it('returns built-in defaults when no options are provided', () => {
    expect(resolveAdapterCommonOptions({})).toEqual({
      name: 'PolymorphicComponent',
      strict: 'throw',
    })
  })

  it('supports custom defaults for both fields (Lit adapter pattern)', () => {
    expect(resolveAdapterCommonOptions({}, 'PolymorphicElement', false)).toEqual({
      name: 'PolymorphicElement',
      strict: false,
    })
  })
})

describe('resolveAdapterCommonOptions — name resolution', () => {
  it('uses the explicit name when provided', () => {
    expect(resolveAdapterCommonOptions({ name: 'Button' })).toEqual({
      name: 'Button',
      strict: 'throw',
    })
  })

  it('explicit name wins over custom defaultName', () => {
    expect(resolveAdapterCommonOptions({ name: 'Nav' }, 'PolymorphicElement')).toEqual({
      name: 'Nav',
      strict: 'throw',
    })
  })
})

describe('resolveAdapterCommonOptions — strict resolution', () => {
  it('uses enforcement.strict when provided', () => {
    expect(resolveAdapterCommonOptions({ enforcement: { strict: 'warn' } })).toEqual({
      name: 'PolymorphicComponent',
      strict: 'warn',
    })
  })

  it('falls back to the built-in default when enforcement is absent', () => {
    expect(resolveAdapterCommonOptions({})).toEqual({
      name: 'PolymorphicComponent',
      strict: 'throw',
    })
  })

  it('falls back to the built-in default when enforcement.strict is absent', () => {
    expect(resolveAdapterCommonOptions({ enforcement: {} })).toEqual({
      name: 'PolymorphicComponent',
      strict: 'throw',
    })
  })

  it('enforcement.strict wins over custom defaultStrict', () => {
    expect(
      resolveAdapterCommonOptions(
        { enforcement: { strict: 'warn' } },
        'PolymorphicComponent',
        false,
      ),
    ).toEqual({ name: 'PolymorphicComponent', strict: 'warn' })
  })

  it.each([false, 'warn', 'async-warn', 'throw', true] as const)(
    'passes strict=%s through unchanged',
    (strict) => {
      expect(resolveAdapterCommonOptions({ enforcement: { strict } }).strict).toBe(strict)
    },
  )
})
