import { describe, expect, it } from 'vitest'
import type { Diagnostic } from './Diagnostic'

describe('Diagnostic', () => {
  it('accepts error severity', () => {
    const d: Diagnostic = { code: 'E001', message: 'something failed', severity: 'error' }
    expect(d.severity).toBe('error')
  })

  it('accepts warning severity', () => {
    const d: Diagnostic = { code: 'W001', message: 'something suspicious', severity: 'warning' }
    expect(d.severity).toBe('warning')
  })

  it('accepts info severity', () => {
    const d: Diagnostic = { code: 'I001', message: 'something informational', severity: 'info' }
    expect(d.severity).toBe('info')
  })

  it('exposes code and message', () => {
    const d: Diagnostic = { code: 'E002', message: 'missing field', severity: 'error' }
    expect(d.code).toBe('E002')
    expect(d.message).toBe('missing field')
  })
})
