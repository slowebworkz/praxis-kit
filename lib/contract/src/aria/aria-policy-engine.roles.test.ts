import { describe, expect, it } from 'vitest'

import { makeCollecting, makeValidator } from './aria-policy-engine.helpers'
import { throwDiagnostics, silentDiagnostics } from '@praxis-kit/diagnostics'

// ---------------------------------------------------------------------------
// validate() — #checkRedundantRole
// ---------------------------------------------------------------------------

describe('validate() — redundant role', () => {
  it('warns when nav has role="navigation" (redundant)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('nav', { role: 'navigation' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips the redundant role from returned props', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('nav', { role: 'navigation' })
    expect(props).not.toHaveProperty('role')
  })

  it('warns but does not throw when strict is "throw" (warning severity)', () => {
    const { reporter, engine } = makeCollecting()
    expect(() => engine.validate('nav', { role: 'navigation' })).not.toThrow()
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('is silent but still strips invalid role when strict is false', () => {
    const { props } = makeValidator(silentDiagnostics).validate('nav', { role: 'navigation' })
    expect(props).not.toHaveProperty('role')
  })

  it('validates all landmark elements for redundant role', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('main', { role: 'main' })
    engine.validate('aside', { role: 'complementary' })
    engine.validate('header', { role: 'banner' })
    engine.validate('footer', { role: 'contentinfo' })
    expect(reporter.diagnostics).toHaveLength(4)
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkInvalidRoleOverride (strong landmark + role="region")
// ---------------------------------------------------------------------------

describe('validate() — region override on strong landmark', () => {
  it('warns when nav has role="region"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('nav', { role: 'region' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips role from returned props', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('nav', { role: 'region' })
    expect(props).not.toHaveProperty('role')
  })

  it('warns when main has role="region"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('main', { role: 'region' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('warns when aside has role="region"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('aside', { role: 'region' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('throws when strict is "throw"', () => {
    expect(() => makeValidator(throwDiagnostics).validate('nav', { role: 'region' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkStandaloneRegion
// ---------------------------------------------------------------------------

describe('validate() — standalone element + role="region"', () => {
  it('warns when article has role="region"', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('article', { role: 'region' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips role from returned props', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('article', { role: 'region' })
    expect(props).not.toHaveProperty('role')
  })

  it('throws when strict is "throw"', () => {
    expect(() => makeValidator(throwDiagnostics).validate('article', { role: 'region' })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// validate() — role="" edge case
// ---------------------------------------------------------------------------

describe('validate() — empty role attribute', () => {
  it('strips the empty role from returned props', () => {
    const { props } = makeValidator(silentDiagnostics).validate('nav', { role: '' })
    expect(props).not.toHaveProperty('role')
  })

  it('pushes a violation for the empty role', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', { role: '' })
    expect(violations).toHaveLength(1)
    expect(violations[0]?.message).toMatch(/empty role/)
  })

  it('preserves other props when stripping the empty role', () => {
    const { props } = makeValidator(silentDiagnostics).validate('nav', {
      role: '',
      className: 'site-nav',
    })
    expect(props).toHaveProperty('className', 'site-nav')
    expect(props).not.toHaveProperty('role')
  })
})

// ---------------------------------------------------------------------------
// validate() — valid role assignments (no violation)
// ---------------------------------------------------------------------------

describe('validate() — valid role assignments', () => {
  it('allows nav + role="banner" (non-redundant, non-region)', () => {
    const { reporter, engine } = makeCollecting()
    const { props, violations } = engine.validate('nav', { role: 'banner' })
    expect(reporter.diagnostics).toHaveLength(0)
    expect(props).toHaveProperty('role', 'banner')
    expect(violations).toHaveLength(0)
  })

  it('passes through non-role props untouched on violation', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('nav', {
      role: 'navigation',
      className: 'site-nav',
    })
    expect(props).toHaveProperty('className', 'site-nav')
    expect(props).not.toHaveProperty('role')
  })
})

// ---------------------------------------------------------------------------
// validate() — implicit role expansion (attribute check without explicit role)
// ---------------------------------------------------------------------------

describe('validate() — implicit role expansion', () => {
  it('allows aria-expanded on <button> (implicit button role permits it)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {
      'aria-expanded': 'false',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-checked on <button> (implicit button role does not permit it)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('button', { 'aria-checked': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips aria-checked from <button> props', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('button', { 'aria-checked': 'true' })
    expect(props).not.toHaveProperty('aria-checked')
  })

  it('allows aria-level on <h2> (implicit heading role permits it)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('h2', { 'aria-level': '3' })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-pressed on <a> (implicit link role does not permit it)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('a', { 'aria-pressed': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// validate() — regression: role-level violations have attribute: undefined
// ---------------------------------------------------------------------------

describe('validate() — role violations have attribute: undefined', () => {
  it('redundant role violation has attribute: undefined', () => {
    const { violations } = makeCollecting().engine.validate('nav', { role: 'navigation' })
    expect(violations[0]?.attribute).toBeUndefined()
  })

  it('invalid role override violation has attribute: undefined', () => {
    const { violations } = makeCollecting().engine.validate('nav', { role: 'region' })
    expect(violations[0]?.attribute).toBeUndefined()
  })

  it('standalone region violation has attribute: undefined', () => {
    const { violations } = makeCollecting().engine.validate('article', { role: 'region' })
    expect(violations[0]?.attribute).toBeUndefined()
  })

  it('empty role violation has attribute: undefined', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('nav', { role: '' })
    expect(violations[0]?.attribute).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// validate() — role violation + attribute violation coexist
// ---------------------------------------------------------------------------

describe('validate() — role and attribute violations coexist', () => {
  it('produces violations for both the role and the invalid attribute', () => {
    const { violations } = makeCollecting().engine.validate('nav', {
      role: 'navigation',
      'aria-checked': 'true',
    })
    // One for redundant role, one for aria-checked on navigation
    expect(violations).toHaveLength(2)
  })

  it('strips both the redundant role and the invalid attribute', () => {
    const { engine } = makeCollecting()
    const { props } = engine.validate('nav', {
      role: 'navigation',
      'aria-checked': 'true',
    })
    expect(props).not.toHaveProperty('role')
    expect(props).not.toHaveProperty('aria-checked')
  })

  it('violation list has one entry with attribute set and one without', () => {
    const { violations } = makeCollecting().engine.validate('nav', {
      role: 'navigation',
      'aria-checked': 'true',
    })
    const roleViolation = violations.find((v) => v.attribute === undefined)
    const attrViolation = violations.find((v) => v.attribute === 'aria-checked')
    expect(roleViolation).toBeDefined()
    expect(attrViolation).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// validate() — expanded static implicit roles
// ---------------------------------------------------------------------------

describe('validate() — textarea (implicit role: textbox)', () => {
  it('allows aria-multiline on textarea (valid for textbox)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('textarea', {
      'aria-multiline': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-checked on textarea (not valid for textbox)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('textarea', { 'aria-checked': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('strips aria-checked from textarea props', () => {
    const { props } = makeValidator(silentDiagnostics).validate('textarea', {
      'aria-checked': 'true',
    })
    expect(props).not.toHaveProperty('aria-checked')
  })

  it('warns for redundant role="textbox" on textarea', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('textarea', { role: 'textbox' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })
})

describe('validate() — fieldset (implicit role: group)', () => {
  it('allows aria-activedescendant on fieldset (valid for group)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('fieldset', {
      'aria-activedescendant': 'input-id',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-checked on fieldset (not valid for group)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('fieldset', { 'aria-checked': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })
})

describe('validate() — dialog (implicit role: dialog)', () => {
  it('allows aria-modal on dialog (valid for dialog role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('dialog', {
      'aria-modal': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for redundant role="dialog" on dialog element', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('dialog', { role: 'dialog' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })
})

describe('validate() — progress (implicit role: progressbar)', () => {
  it('allows aria-valuenow on progress (valid for progressbar)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('progress', {
      'aria-valuenow': '50',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-checked on progress (not valid for progressbar)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('progress', { 'aria-checked': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })
})

describe('validate() — output (implicit role: status)', () => {
  it('does not flag aria-label on output (global attribute is always valid)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('output', {
      'aria-label': 'Result',
    })
    // aria-label is globally valid — any violations are about missing aria-live, not the label
    expect(violations.some((v) => v.attribute === 'aria-label')).toBe(false)
  })

  it('injects aria-live="polite" on output (status role implies it)', () => {
    const { props } = makeValidator(silentDiagnostics).validate('output', {})
    expect(props).toHaveProperty('aria-live', 'polite')
  })
})

// ---------------------------------------------------------------------------
// validate() — input[type=...] implicit role
// ---------------------------------------------------------------------------

describe('validate() — input implicit roles via type attribute', () => {
  it('allows aria-checked on input[type=checkbox] (checkbox role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'checkbox',
      'aria-checked': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-pressed on input[type=checkbox] (not valid for checkbox)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('input', { type: 'checkbox', 'aria-pressed': 'true' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  it('allows aria-checked on input[type=radio] (radio role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'radio',
      'aria-checked': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('allows aria-multiline on input[type=text] (textbox role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'text',
      'aria-multiline': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('treats input with no type as textbox', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      'aria-multiline': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('allows aria-valuenow on input[type=range] (slider role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'range',
      'aria-valuenow': '50',
    })
    expect(violations).toHaveLength(0)
  })

  it('allows aria-valuenow on input[type=number] (spinbutton role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'number',
      'aria-valuenow': '5',
    })
    expect(violations).toHaveLength(0)
  })

  it('skips validation for input[type=hidden] (no ARIA role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'hidden',
      'aria-checked': 'true',
    })
    // No implicit role → engine skips → no false positive
    expect(violations).toHaveLength(0)
  })

  it('does not share cache between input[type=checkbox] and input[type=radio]', () => {
    const engine = makeValidator(silentDiagnostics)
    // checkbox allows aria-checked; radio also allows it — test with an attribute invalid on one but valid on both
    // Use aria-pressed: valid on button only, not checkbox or radio
    engine.validate('input', { type: 'checkbox', 'aria-pressed': 'true' })
    const { violations } = engine.validate('input', { type: 'radio', 'aria-pressed': 'true' })
    // Radio also doesn't allow aria-pressed — violation should appear (not a stale checkbox cache hit)
    expect(violations.some((v) => v.attribute === 'aria-pressed')).toBe(true)
  })

  it('treats input[type=text] with a list attribute as combobox, not textbox', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('input', {
      type: 'text',
      list: 'options',
      'aria-expanded': 'false',
    })
    // aria-expanded is required (not merely valid) for combobox — no violation confirms the
    // engine resolved role=combobox, since aria-expanded isn't a recognized attribute for textbox.
    expect(violations).toHaveLength(0)
  })

  it('does not flag role="textbox" as redundant on input[type=text list=...] (implicit role is combobox)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('input', { type: 'text', list: 'options', role: 'textbox' })
    // role="textbox" is a legitimate override of the *actual* implicit role (combobox) back to
    // textbox-like behavior — flagging it redundant would incorrectly auto-strip it.
    expect(reporter.diagnostics).toHaveLength(0)
  })

  it('still flags role="textbox" as redundant on input[type=text] with no list', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('input', { type: 'text', role: 'textbox' })
    expect(reporter.diagnostics.length).toBeGreaterThan(0)
  })

  for (const type of ['search', 'tel', 'url', 'email']) {
    it(`treats input[type=${type}] with a list attribute as combobox`, () => {
      const { violations } = makeValidator(silentDiagnostics).validate('input', {
        type,
        list: 'options',
        role: 'textbox',
      })
      expect(violations.some((v) => v.message.includes('redundant'))).toBe(false)
    })
  }

  for (const type of ['checkbox', 'radio', 'range', 'number']) {
    it(`ignores list on input[type=${type}] (combobox override only applies to text-like types)`, () => {
      const { engine } = makeCollecting()
      // combobox requires aria-expanded; if list wrongly promoted these types to combobox, this
      // would produce a "missing aria-expanded" violation. It must not.
      const { violations } = engine.validate('input', { type, list: 'options' })
      expect(violations.some((v) => v.message.includes('aria-expanded'))).toBe(false)
    })
  }

  it('ignores an empty-string list attribute the same as a present one (still combobox)', () => {
    const { reporter, engine } = makeCollecting()
    engine.validate('input', { type: 'text', list: '', role: 'textbox' })
    expect(reporter.diagnostics).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// validate() — conditional landmarks: section and form
// ---------------------------------------------------------------------------

describe('validate() — section conditional landmark (role: region when named)', () => {
  it('derives role=region when section has aria-label', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('section', {
      'aria-label': 'News',
      role: 'region',
    })
    // role="region" matches implicit region → redundant → one warning
    expect(violations.some((v) => v.message.includes('redundant'))).toBe(true)
  })

  it('engine skips unnamed section (no implicit role without accessible name)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('section', {
      'aria-checked': 'true',
    })
    // No implicit role → no processing → no false positives
    expect(violations).toHaveLength(0)
  })

  it('treats whitespace-only aria-label as unnamed (no implicit region role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('section', {
      'aria-label': '   ',
      'aria-checked': 'true',
    })
    // A whitespace-only label is not an accessible name — section stays roleless, so
    // aria-checked (invalid for region) must not be flagged either.
    expect(violations).toHaveLength(0)
  })

  it('treats whitespace-only aria-labelledby as unnamed (no implicit region role)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('section', {
      'aria-labelledby': '   ',
      'aria-checked': 'true',
    })
    expect(violations).toHaveLength(0)
  })

  it('validates aria-* on section when aria-labelledby provides the name', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('section', {
      'aria-labelledby': 'heading-id',
      'aria-checked': 'true',
    })
    // section → region; aria-checked is not valid for region → violation
    expect(violations.some((v) => v.attribute === 'aria-checked')).toBe(true)
  })
})

describe('validate() — form conditional landmark (role: form when named)', () => {
  it('derives role=form when form has aria-label', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('form', {
      'aria-label': 'Login',
      role: 'form',
    })
    // role="form" matches implicit form → redundant → one warning
    expect(violations.some((v) => v.message.includes('redundant'))).toBe(true)
  })

  it('engine skips unnamed form (no implicit role without accessible name)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('form', {
      'aria-checked': 'true',
    })
    expect(violations).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// validate() — img implicit role (alt="" → none, otherwise → img)
// ---------------------------------------------------------------------------

describe('validate() — img implicit role', () => {
  it('derives role=img when alt is absent', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('img', {
      'aria-label': 'Company logo',
    })
    // aria-label is global and valid for img role — no violation
    expect(violations).toHaveLength(0)
  })

  it('derives role=img when alt is non-empty', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('img', {
      alt: 'Company logo',
      'aria-label': 'Company logo',
    })
    expect(violations).toHaveLength(0)
  })

  it('warns for aria-label when alt="" (decorative, role=none)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('img', {
      alt: '',
      'aria-label': 'Logo',
    })
    expect(violations.some((v) => v.attribute === 'aria-label')).toBe(true)
  })

  it('strips aria-label from decorative img (alt="")', () => {
    const { props } = makeValidator(silentDiagnostics).validate('img', {
      alt: '',
      'aria-label': 'Logo',
    })
    expect(props).not.toHaveProperty('aria-label')
  })

  it('warns for aria-labelledby when alt="" (decorative)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('img', {
      alt: '',
      'aria-labelledby': 'caption',
    })
    expect(violations.some((v) => v.attribute === 'aria-labelledby')).toBe(true)
  })

  it('allows aria-hidden on decorative img (redundant but harmless)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('img', {
      alt: '',
      'aria-hidden': 'true',
    })
    expect(violations.some((v) => v.attribute === 'aria-hidden')).toBe(false)
  })

  it('does not share cache between alt="" and alt="logo"', () => {
    const engine = makeValidator(silentDiagnostics)
    // First call: alt="" → decorative; aria-label is flagged
    const r1 = engine.validate('img', { alt: '', 'aria-label': 'Logo' })
    expect(r1.violations.some((v) => v.attribute === 'aria-label')).toBe(true)
    // Second call: alt="logo" → semantic img; aria-label is valid (global)
    const r2 = engine.validate('img', { alt: 'Logo', 'aria-label': 'Logo' })
    expect(r2.violations.some((v) => v.attribute === 'aria-label')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validate() — #checkNameRequiredRoles (role=img)
// ---------------------------------------------------------------------------

describe('validate() — accessible name required for role=img', () => {
  it('warns when <img> has no alt and no aria-label', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('img', {})
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(true)
  })

  it('does not warn when <img> has non-empty alt (native accessible name)', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('img', { alt: 'Company logo' })
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(false)
  })

  it('does not warn when <img> has aria-label', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('img', {
      'aria-label': 'Chart',
    })
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(false)
  })

  it('does not warn when <img> has aria-labelledby', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('img', {
      'aria-labelledby': 'caption-id',
    })
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(false)
  })

  it('does not warn when <img alt=""> (decorative, role=none)', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('img', { alt: '' })
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(false)
  })

  it('warns when <div role="img"> has no aria-label', () => {
    const { violations } = makeValidator(silentDiagnostics).validate('div', { role: 'img' })
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(true)
  })

  it('does not warn when <div role="img"> has aria-label', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('div', {
      role: 'img',
      'aria-label': 'Revenue chart',
    })
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(false)
  })

  it('does not warn for non-img roles', () => {
    const { violations } = makeValidator(throwDiagnostics).validate('button', {})
    expect(violations.some((v) => v.message.includes('accessible name'))).toBe(false)
  })
})
