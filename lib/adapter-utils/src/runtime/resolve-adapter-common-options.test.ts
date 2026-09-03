import { describe, it, expect } from 'vitest'
import { resolveAdapterCommonOptions } from './resolve-adapter-common-options'
import { throwDiagnostics, warnDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'

describe('resolveAdapterCommonOptions — defaults', () => {
  it('returns built-in defaults when no options are provided', () => {
    const result = resolveAdapterCommonOptions({})
    expect(result.name).toBe('PolymorphicComponent')
    expect(result.diagnostics).toBe(throwDiagnostics)
  })

  it('supports custom defaults for both fields (Lit adapter pattern)', () => {
    const result = resolveAdapterCommonOptions({}, 'PolymorphicElement', silentDiagnostics)
    expect(result.name).toBe('PolymorphicElement')
    expect(result.diagnostics).toBe(silentDiagnostics)
  })
})

describe('resolveAdapterCommonOptions — name resolution', () => {
  it('uses the explicit name when provided', () => {
    const result = resolveAdapterCommonOptions({ name: 'Button' })
    expect(result.name).toBe('Button')
    expect(result.diagnostics).toBe(throwDiagnostics)
  })

  it('explicit name wins over custom defaultName', () => {
    const result = resolveAdapterCommonOptions({ name: 'Nav' }, 'PolymorphicElement')
    expect(result.name).toBe('Nav')
    expect(result.diagnostics).toBe(throwDiagnostics)
  })
})

describe('resolveAdapterCommonOptions — diagnostics resolution', () => {
  it('uses enforcement.diagnostics when provided', () => {
    const result = resolveAdapterCommonOptions({ enforcement: { diagnostics: warnDiagnostics } })
    expect(result.diagnostics).toBe(warnDiagnostics)
  })

  it('falls back to the built-in default when enforcement is absent', () => {
    expect(resolveAdapterCommonOptions({}).diagnostics).toBe(throwDiagnostics)
  })

  it('falls back to the built-in default when enforcement.diagnostics is absent', () => {
    expect(resolveAdapterCommonOptions({ enforcement: {} }).diagnostics).toBe(throwDiagnostics)
  })

  it('enforcement.diagnostics wins over custom defaultDiagnostics', () => {
    const result = resolveAdapterCommonOptions(
      { enforcement: { diagnostics: warnDiagnostics } },
      'PolymorphicComponent',
      silentDiagnostics,
    )
    expect(result.diagnostics).toBe(warnDiagnostics)
  })

  it.each([throwDiagnostics, warnDiagnostics, silentDiagnostics])(
    'passes diagnostics through unchanged',
    (d) => {
      expect(resolveAdapterCommonOptions({ enforcement: { diagnostics: d } }).diagnostics).toBe(d)
    },
  )

  it.each([
    ['warn', warnDiagnostics],
    ['throw', throwDiagnostics],
    ['silent', silentDiagnostics],
  ] as const)('resolves the "%s" preset name to its Diagnostics instance', (mode, preset) => {
    expect(resolveAdapterCommonOptions({ enforcement: { diagnostics: mode } }).diagnostics).toBe(
      preset,
    )
  })
})
