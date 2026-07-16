import { describe, expect, it } from 'vitest'

import { makeValidator } from './aria-policy-engine.helpers'
import { throwDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'

// ---------------------------------------------------------------------------
// validate() — #checkAriaAttributeValues
// ---------------------------------------------------------------------------

describe('validate() — ARIA attribute value validation', () => {
  // ── Boolean attributes ───────────────────────────────────────────────────

  it('accepts "true" string for aria-expanded', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-expanded': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(false)
  })

  it('accepts boolean true for aria-expanded (JSX shorthand)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-expanded': true,
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(false)
  })

  it('accepts "false" string for aria-expanded', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-expanded': 'false',
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(false)
  })

  it('warns for "yes" on aria-expanded (not a boolean)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('button', {
      'aria-expanded': 'yes',
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(true)
  })

  it('warns for numeric 1 on aria-expanded', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('button', {
      'aria-expanded': 1 as never,
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(true)
  })

  it('strips invalid aria-expanded value', () => {
    const { props } = makeValidator(silentDiagnostics).validate('button', {
      'aria-expanded': 'yes',
    })
    expect(props).not.toHaveProperty('aria-expanded')
  })

  // ── Tristate attributes ──────────────────────────────────────────────────

  it('accepts "mixed" for aria-checked (tristate)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      role: 'checkbox',
      'aria-checked': 'mixed',
    })
    expect(violations.some((v) => v.attribute === 'aria-checked')).toBe(false)
  })

  it('warns for "partial" on aria-checked (not a valid tristate)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', {
      role: 'checkbox',
      'aria-checked': 'partial',
    })
    expect(violations.some((v) => v.attribute === 'aria-checked')).toBe(true)
  })

  it('accepts "mixed" for aria-pressed', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-pressed': 'mixed',
    })
    expect(violations.some((v) => v.attribute === 'aria-pressed')).toBe(false)
  })

  // ── Numeric attributes ───────────────────────────────────────────────────

  it('accepts numeric value for aria-valuenow', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'slider',
      'aria-valuenow': 50,
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(false)
  })

  it('accepts numeric string for aria-valuenow', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'slider',
      'aria-valuenow': '50',
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(false)
  })

  it('warns for non-numeric string on aria-valuenow', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'slider',
      'aria-valuenow': 'fifty',
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(true)
  })

  // ── Integer range attributes ─────────────────────────────────────────────

  it('accepts aria-level="3" on h2 (valid override)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h2', {
      'aria-level': '3',
    })
    expect(violations.some((v) => v.attribute === 'aria-level')).toBe(false)
  })

  it('warns for aria-level="0" (below minimum of 1)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('h2', {
      'aria-level': '0',
    })
    expect(violations.some((v) => v.attribute === 'aria-level')).toBe(true)
  })

  it('warns for aria-level="7" (above maximum of 6)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('h2', {
      'aria-level': '7',
    })
    expect(violations.some((v) => v.attribute === 'aria-level')).toBe(true)
  })

  it('accepts aria-level={6} (numeric, within range)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h2', {
      'aria-level': 6,
    })
    expect(violations.some((v) => v.attribute === 'aria-level')).toBe(false)
  })

  // ── Enum attributes ──────────────────────────────────────────────────────

  it('accepts valid aria-sort token "ascending"', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      role: 'columnheader',
      'aria-sort': 'ascending',
    })
    expect(violations.some((v) => v.attribute === 'aria-sort')).toBe(false)
  })

  it('warns for invalid aria-sort token "asc"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', {
      role: 'columnheader',
      'aria-sort': 'asc',
    })
    expect(violations.some((v) => v.attribute === 'aria-sort')).toBe(true)
  })

  it('accepts valid aria-haspopup "menu"', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-haspopup': 'menu',
    })
    expect(violations.some((v) => v.attribute === 'aria-haspopup')).toBe(false)
  })

  it('warns for invalid aria-haspopup "popup"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('button', {
      'aria-haspopup': 'popup',
    })
    expect(violations.some((v) => v.attribute === 'aria-haspopup')).toBe(true)
  })

  it('accepts valid aria-autocomplete "list"', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'combobox',
      'aria-expanded': 'false',
      'aria-autocomplete': 'list',
    })
    expect(violations.some((v) => v.attribute === 'aria-autocomplete')).toBe(false)
  })

  it('accepts valid aria-live "polite"', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'status',
      'aria-live': 'polite',
    })
    expect(violations.some((v) => v.attribute === 'aria-live')).toBe(false)
  })

  it('warns for invalid aria-live "eager"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'alert',
      'aria-live': 'eager',
    })
    expect(violations.some((v) => v.attribute === 'aria-live')).toBe(true)
  })

  it('does not fire for presentational elements (attrs handled by presentational check)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'none',
      'aria-expanded': 'yes',
    })
    // presentational check fires; value check defers
    const valueViolation = violations.find(
      (v) => v.attribute === 'aria-expanded' && v.message.includes('invalid value'),
    )
    expect(valueViolation).toBeUndefined()
  })
})
