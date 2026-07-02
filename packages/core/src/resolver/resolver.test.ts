import { describe, expect, it, vi } from 'vitest'
import { enforceAllowedAs } from './resolver'
import { throwDiagnostics, warnDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'

describe('enforceAllowedAs()', () => {
  it('does nothing when tag is in allowedAs', () => {
    expect(() => enforceAllowedAs('section', ['article', 'section'], warnDiagnostics)).not.toThrow()
  })

  it('does nothing when diagnostics is undefined', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    enforceAllowedAs('div', ['article', 'section'], undefined)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('does nothing when diagnostics is silentDiagnostics', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    enforceAllowedAs('div', ['article', 'section'], silentDiagnostics)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('reports to console.warn when warnDiagnostics and tag not allowed', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    enforceAllowedAs('div', ['article', 'section'], warnDiagnostics)
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0]![0]).toContain('"div"')
    expect(spy.mock.calls[0]![0]).toContain('"article"')
    spy.mockRestore()
  })

  it('throws when throwDiagnostics and tag not allowed', () => {
    expect(() => enforceAllowedAs('div', ['article', 'section'], throwDiagnostics)).toThrow(/"div"/)
  })

  it('includes displayName in message when provided', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    enforceAllowedAs('div', ['article'], warnDiagnostics, 'Heading')
    expect(spy.mock.calls[0]![0]).toContain('<Heading>')
    spy.mockRestore()
  })
})
