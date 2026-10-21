import { describe, expect, it } from 'vitest'

import { DiagnosticCode } from './codes'

describe('DiagnosticCode', () => {
  const codes = Object.values(DiagnosticCode)

  it('uses unique code strings, so a newly allocated code cannot shadow an existing one', () => {
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('keeps every code in the stable <AREA><4 digits> shape', () => {
    for (const code of codes) expect(code).toMatch(/^[A-Z][A-Z0-9]*\d{4}$/)
  })

  it('allocates COMP1016 to the composition plugin conflict', () => {
    expect(DiagnosticCode.CompositionPluginConflict).toBe('COMP1016')
  })
})
