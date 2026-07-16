import { describe, expect, it } from 'vitest'

import { makeCollecting, makeValidator } from './aria-policy-engine.helpers'
import { throwDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'

// ---------------------------------------------------------------------------
// validate() — #checkInvalidAriaAttributes (aria-* on wrong role)
// ---------------------------------------------------------------------------

describe('validate() — aria-* attribute on wrong role', () => {
  it('warns for aria-checked on role="button"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('nav', { role: 'button', 'aria-checked': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips aria-checked from props when role="button"', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('nav', {
      role: 'button',
      'aria-checked': 'true',
    })
    expect(props).not.toHaveProperty('aria-checked')
  })

  it('warns for aria-pressed on role="checkbox"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('nav', { role: 'checkbox', 'aria-pressed': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips aria-pressed when role="checkbox"', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('nav', {
      role: 'checkbox',
      'aria-pressed': 'true',
    })
    expect(props).not.toHaveProperty('aria-pressed')
  })

  it('warns for aria-level on role="button"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('nav', { role: 'button', 'aria-level': '2' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('produces one violation per invalid attribute when multiple are present', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', {
      role: 'button',
      'aria-checked': 'true',
      'aria-level': '2',
    })
    expect(violations).toHaveLength(2)
  })

  it('strips all invalid attributes when multiple are present', () => {
    const { props } = makeValidator(silentDiagnostics).validate('nav', {
      role: 'button',
      'aria-checked': 'true',
      'aria-level': '2',
    })
    expect(props).not.toHaveProperty('aria-checked')
    expect(props).not.toHaveProperty('aria-level')
  })

  it('produces no violation for a global attribute (aria-label) on any role', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      role: 'button',
      'aria-label': 'close',
    })
    expect(violations).toHaveLength(0)
  })

  it('produces no violation for a valid pair (aria-checked on checkbox)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      role: 'checkbox',
      'aria-checked': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('produces no violation for an unknown/uncurated attribute', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      role: 'button',
      'aria-foo-custom': 'value',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns when element has no effective role and a restricted attribute is present', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('div', { 'aria-checked': 'true' })
    // div has no implicit role — engine skips validation entirely, no false positive
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('sets attribute field on violation to the offending aria-* key', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', {
      role: 'button',
      'aria-checked': 'true',
    })
    expect(violations[0]?.attribute).toBe('aria-checked')
  })

  it('does not throw even when strict is "throw" (warning severity)', () => {
    expect(() =>
      makeValidator(throwDiagnostics).validate('nav', { role: 'button', 'aria-checked': 'true' }),
    ).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// validate() — global aria-* attributes pass through without implicit role
// ---------------------------------------------------------------------------

describe('validate() — global aria-* attributes always pass through', () => {
  it('allows aria-label on <button> with no explicit role', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-label': 'close',
    })
    expect(violations).toHaveLength(0)
  })

  it('allows aria-hidden on <h1> with no explicit role', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h1', { 'aria-hidden': 'true' })
    expect(violations).toHaveLength(0)
  })

  it('allows aria-describedby on <nav> with no explicit role', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      'aria-describedby': 'desc',
    })
    expect(violations).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkPresentationalAriaAttributes (explicit role=none/presentation)
// ---------------------------------------------------------------------------

describe('validate() — ARIA attributes on presentational role', () => {
  it('warns for aria-label when role="none"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'none',
      'aria-label': 'Decorative',
    })
    expect(violations.some((v) => v.attribute === 'aria-label')).toBe(true)
  })

  it('strips aria-label from role="none" element', () => {
    const { props } = makeValidator(silentDiagnostics).validate('div', {
      role: 'none',
      'aria-label': 'Decorative',
    })
    expect(props).not.toHaveProperty('aria-label')
  })

  it('warns for aria-labelledby when role="presentation"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'presentation',
      'aria-labelledby': 'heading',
    })
    expect(violations.some((v) => v.attribute === 'aria-labelledby')).toBe(true)
  })

  it('allows aria-hidden on role="none" (redundant but harmless)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'none',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(false)
  })

  it('produces no duplicate violations — #checkInvalidAriaAttributes defers to presentational check', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'none',
      'aria-checked': 'true',
    })
    // Exactly one violation for aria-checked (from presentational check, not invalid-attr check)
    const ariaCheckedViolations = violations.filter((v) => v.attribute === 'aria-checked')
    expect(ariaCheckedViolations).toHaveLength(1)
  })

  it('flags multiple ARIA attributes on role="none"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'none',
      'aria-label': 'foo',
      'aria-describedby': 'bar',
    })
    expect(violations.some((v) => v.attribute === 'aria-label')).toBe(true)
    expect(violations.some((v) => v.attribute === 'aria-describedby')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkAriaHiddenOnFocusable
// ---------------------------------------------------------------------------

describe('validate() — aria-hidden="true" on focusable elements', () => {
  it('throws for aria-hidden="true" on <button> (error severity)', () => {
    expect(() =>
      makeValidator(throwDiagnostics).validate('button', { 'aria-hidden': 'true' }),
    ).toThrow()
  })

  it('reports an error-severity violation for aria-hidden on <button>', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('button', {
      'aria-hidden': 'true',
    })
    const v = violations.find((v) => v.attribute === 'aria-hidden')
    expect(v).toBeDefined()
    expect(v?.severity).toBe('error')
  })

  it('reports a violation for aria-hidden on <input>', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('input', {
      type: 'text',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(true)
  })

  it('reports a violation for aria-hidden on <select>', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('select', {
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(true)
  })

  it('reports a violation for aria-hidden on <a>', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('a', {
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(true)
  })

  it('does not flag aria-hidden on non-interactive <div>', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'presentation',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(false)
  })

  it('does not flag aria-hidden="false" on interactive elements', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-hidden': 'false',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(false)
  })

  it('flags aria-hidden on <h2 tabindex="0"> (non-interactive but explicitly tabbable)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('h2', {
      tabindex: '0',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(true)
  })

  it('does not flag aria-hidden on <h2 tabindex="-1"> (programmatic focus only)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h2', {
      tabindex: '-1',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(false)
  })

  it('fires through the full pipeline for explicit role elements', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('button', {
      role: 'listbox',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkRequiredAriaProperties
// ---------------------------------------------------------------------------

describe('validate() — WAI-ARIA required properties', () => {
  it('warns for missing aria-expanded on role="combobox"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'combobox',
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(true)
  })

  it('no violation when aria-expanded is present on role="combobox"', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'combobox',
      'aria-expanded': 'false',
    })
    expect(violations.some((v) => v.attribute === 'aria-expanded')).toBe(false)
  })

  it('warns for missing aria-selected on role="option"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('li', {
      role: 'option',
    })
    expect(violations.some((v) => v.attribute === 'aria-selected')).toBe(true)
  })

  it('no violation when aria-selected is present on role="option"', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('li', {
      role: 'option',
      'aria-selected': 'false',
    })
    expect(violations.some((v) => v.attribute === 'aria-selected')).toBe(false)
  })

  it('warns for missing aria-valuenow on role="slider"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'slider',
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(true)
  })

  it('warns for missing aria-valuenow on input[type=range] (implicit slider)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('input', {
      type: 'range',
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(true)
  })

  it('no violation for input[type=range] when aria-valuenow is present', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'range',
      'aria-valuenow': '50',
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(false)
  })

  it('warns for missing aria-controls and aria-valuenow on role="scrollbar"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'scrollbar',
    })
    expect(violations.some((v) => v.attribute === 'aria-controls')).toBe(true)
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(true)
  })

  it('no violation when all required scrollbar properties are present', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'scrollbar',
      'aria-controls': 'content-id',
      'aria-valuenow': '0',
    })
    expect(violations.some((v) => v.attribute === 'aria-controls')).toBe(false)
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(false)
  })

  it('warns for missing aria-valuenow on role="spinbutton"', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'spinbutton',
    })
    expect(violations.some((v) => v.attribute === 'aria-valuenow')).toBe(true)
  })

  it('violation severity is warning (not error)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'combobox',
    })
    const v = violations.find((v) => v.attribute === 'aria-expanded')
    expect(v?.severity).toBe('warning')
  })

  it('does not fire for roles with no required properties', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('nav', {
      role: 'button',
    })
    expect(violations.some((v) => v.message.includes('required'))).toBe(false)
  })

  it('violation attribute field names the missing property', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', {
      role: 'combobox',
    })
    const v = violations.find((v) => v.attribute === 'aria-expanded')
    expect(v?.attribute).toBe('aria-expanded')
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkRedundantAriaLevel
// ---------------------------------------------------------------------------

describe('validate() — redundant aria-level on heading elements', () => {
  it('warns when h1 has aria-level="1" (matches implicit level)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('h1', { 'aria-level': '1' })
    expect(
      violations.some((v) => v.attribute === 'aria-level' && v.message.includes('redundant')),
    ).toBe(true)
  })

  it('warns when h3 has aria-level={3} (numeric, matches implicit level)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('h3', { 'aria-level': 3 })
    expect(
      violations.some((v) => v.attribute === 'aria-level' && v.message.includes('redundant')),
    ).toBe(true)
  })

  it('strips the redundant aria-level from props', () => {
    const { props } = makeValidator(silentDiagnostics).validate('h2', { 'aria-level': '2' })
    expect(props).not.toHaveProperty('aria-level')
  })

  it('does not warn when aria-level overrides the implicit level', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h2', { 'aria-level': '3' })
    expect(
      violations.some((v) => v.attribute === 'aria-level' && v.message.includes('redundant')),
    ).toBe(false)
  })

  it('does not warn when aria-level is absent on a heading', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h2', {})
    expect(violations.some((v) => v.attribute === 'aria-level')).toBe(false)
  })

  it('does not warn for aria-level on non-heading elements', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'heading',
      'aria-level': '2',
    })
    // role=heading on div with aria-level=2 is not redundant (div has no implicit level)
    expect(
      violations.some((v) => v.attribute === 'aria-level' && v.message.includes('redundant')),
    ).toBe(false)
  })

  it('does not warn when heading has presentational role override', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('h2', {
      role: 'none',
      'aria-level': '2',
    })
    // presentational rule fires, not redundant-level rule
    expect(
      violations.some((v) => v.message.includes('redundant') && v.attribute === 'aria-level'),
    ).toBe(false)
  })
})
