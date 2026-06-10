import { describe, expect, it, vi } from 'vitest'
import { enforceAllowedAs } from './resolver'

describe('enforceAllowedAs()', () => {
  it('does nothing when tag is in allowedAs', () => {
    expect(() => enforceAllowedAs('section', ['article', 'section'], 'warn')).not.toThrow()
  })

  it('does nothing when strict is false/undefined', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    enforceAllowedAs('div', ['article', 'section'], false)
    enforceAllowedAs('div', ['article', 'section'], undefined)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('warns when strict is "warn" and tag not allowed', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    enforceAllowedAs('div', ['article', 'section'], 'warn')
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0]![0]).toContain('"div"')
    expect(spy.mock.calls[0]![0]).toContain('"article"')
    spy.mockRestore()
  })

  it('throws when strict is "throw" and tag not allowed', () => {
    expect(() => enforceAllowedAs('div', ['article', 'section'], 'throw')).toThrow(/"div"/)
  })

  it('throws when strict is true and tag not allowed', () => {
    expect(() => enforceAllowedAs('div', ['article', 'section'], true)).toThrow()
  })

  it('includes displayName in message when provided', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    enforceAllowedAs('div', ['article'], 'warn', 'Heading')
    expect(spy.mock.calls[0]![0]).toContain('<Heading>')
    spy.mockRestore()
  })
})
