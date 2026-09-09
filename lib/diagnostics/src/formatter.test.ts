import { describe, expect, it } from 'vitest'

import { DiagnosticCategory } from './category'
import { DiagnosticCode } from './codes'
import { formatDiagnostic } from './formatter'
import { Severity } from './severity'
import type { Diagnostic } from './types'

const base: Diagnostic = {
  code: DiagnosticCode.InvalidChild,
  category: DiagnosticCategory.Composition,
  severity: Severity.Error,
  message: 'Button cannot be a direct child of Menu',
}

describe('formatDiagnostic', () => {
  it('renders "<Severity> <Code>: [<Category>] <message>"', () => {
    expect(formatDiagnostic(base)).toBe(
      'Error COMP1003: [Composition] Button cannot be a direct child of Menu',
    )
  })

  it('names the severity for every level', () => {
    for (const s of [Severity.Debug, Severity.Info, Severity.Warning, Severity.Error, Severity.Fatal]) {
      expect(formatDiagnostic({ ...base, severity: s })).toContain(`${Severity[s]} `)
    }
  })

  it('omits the category prefix when the category has no enum name', () => {
    const line = formatDiagnostic({ ...base, category: 999 as DiagnosticCategory })
    expect(line).toBe('Error COMP1003: Button cannot be a direct child of Menu')
  })

  it('ignores optional fields (rationale, location, suggestions) — message only', () => {
    const line = formatDiagnostic({
      ...base,
      rationale: 'Menu requires Menu.Item',
      component: 'Menu',
      location: { file: 'x.tsx', start: { line: 1, col: 1 } },
      suggestions: [{ title: 'Wrap it' }],
    })
    expect(line).toBe('Error COMP1003: [Composition] Button cannot be a direct child of Menu')
  })
})
