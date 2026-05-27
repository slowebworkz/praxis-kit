import { bench, describe } from 'vitest'
import { AriaPolicyEngine } from '@praxis-ui/core'

// strict: false suppresses console.warn so violation paths don't flood bench output.
// The evaluate() static method is used where strict overhead should be excluded entirely.
const engine = new AriaPolicyEngine(false)

describe('AriaPolicyEngine.validate — no-op paths', () => {
  bench('div (no implicit role → early exit)', () => {
    engine.validate('div', { className: 'foo' })
  })

  bench('nav (implicit role, no explicit role attr)', () => {
    engine.validate('nav', { className: 'nav-base' })
  })
})

describe('AriaPolicyEngine.validate — role processing', () => {
  bench('nav role="navigation" (redundant → stripped)', () => {
    engine.validate('nav', { role: 'navigation' })
  })

  bench('nav role="region" (invalid override → stripped)', () => {
    engine.validate('nav', { role: 'region' })
  })

  bench('article role="region" (standalone region → stripped)', () => {
    engine.validate('article', { role: 'region' })
  })
})

describe('AriaPolicyEngine.validate — aria attribute processing', () => {
  bench('button aria-checked (invalid attr → stripped)', () => {
    engine.validate('button', { 'aria-checked': 'true' })
  })

  bench('button aria-label (valid global attr → kept)', () => {
    engine.validate('button', { 'aria-label': 'close' })
  })

  bench('button multiple aria attrs (mixed valid/invalid)', () => {
    engine.validate('button', {
      'aria-label': 'close',
      'aria-checked': 'true',
      'aria-expanded': 'false',
    })
  })
})

describe('AriaPolicyEngine.evaluate — static (no strict/report overhead)', () => {
  bench('nav role="navigation" (redundant → stripped)', () => {
    AriaPolicyEngine.evaluate('nav', { role: 'navigation' })
  })

  bench('button aria-checked (invalid attr → stripped)', () => {
    AriaPolicyEngine.evaluate('button', { 'aria-checked': 'true' })
  })
})

// Enterprise components accumulate large ARIA surfaces from multiple concerns:
// base accessibility, dynamic state, telemetry, testing, framework-injected attrs.
// Note: tag must have an implicit role for #deriveContext to proceed past early exit.
// 'div' has no implicit role and short-circuits before any attr scan — use 'button'.

// All-global attrs: tests the pure startsWith + Set.has scan with no violations.
const HEAVY_ARIA_ALL_VALID = {
  'aria-label': 'Confirm purchase',
  'aria-labelledby': 'dialog-title',
  'aria-describedby': 'dialog-desc dialog-hint',
  'aria-live': 'polite',
  'aria-atomic': 'true',
  'aria-relevant': 'additions text',
  'aria-busy': 'false',
  'aria-controls': 'panel-1 panel-2',
  'aria-owns': 'panel-1',
  'aria-setsize': '12',
  'aria-posinset': '3',
  'aria-hidden': 'false',
  'aria-disabled': 'false',
  'aria-keyshortcuts': 'Alt+F4',
  'aria-roledescription': 'carousel',
  'aria-details': 'detail-1',
  'aria-flowto': 'section-2',
  'aria-errormessage': 'err-1',
  'aria-current': 'page',
  // role-restricted but valid for button
  'aria-expanded': 'true',
  'aria-haspopup': 'dialog',
  'aria-pressed': 'false',
  // non-aria props mixed in to reflect real components
  className: 'btn btn--lg',
  id: 'confirm-btn',
  tabIndex: 0,
  type: 'button',
  'data-testid': 'confirm',
  'data-analytics-id': 'cta-confirm',
}

// Mixed valid/invalid: tests scan + violation allocation + fix application.
const HEAVY_ARIA_WITH_VIOLATIONS = {
  ...HEAVY_ARIA_ALL_VALID,
  // These are invalid for button's effective role — each triggers a violation + fix
  'aria-checked': 'mixed',
  'aria-selected': 'true',
  'aria-sort': 'ascending',
  'aria-valuemin': '0',
  'aria-valuemax': '100',
  'aria-valuenow': '42',
  'aria-valuetext': '42 percent',
  'aria-multiselectable': 'false',
  'aria-readonly': 'false',
  'aria-required': 'true',
  'aria-level': '2',
}

describe('AriaPolicyEngine.validate — heavy ARIA payload, all valid (~30 attrs)', () => {
  bench('validate — no violations (scan cost only)', () => {
    engine.validate('button', HEAVY_ARIA_ALL_VALID)
  })
  bench('evaluate static — no violations', () => {
    AriaPolicyEngine.evaluate('button', HEAVY_ARIA_ALL_VALID)
  })
})

describe('AriaPolicyEngine.validate — heavy ARIA payload, many violations (~11 invalid attrs)', () => {
  bench('validate — violations + fix allocation', () => {
    engine.validate('button', HEAVY_ARIA_WITH_VIOLATIONS)
  })
  bench('evaluate static — violations + fix allocation', () => {
    AriaPolicyEngine.evaluate('button', HEAVY_ARIA_WITH_VIOLATIONS)
  })
})

// Repeated same tag → V8 monomorphic IC on getImplicitRole + IMPLICIT_ROLE_RECORD lookup.
// Rotating tags → polymorphic IC; exposes whether tag dispatch is a real cost center.
const ROTATING_TAGS = ['button', 'nav', 'article', 'input', 'a', 'form'] as const
let rotatingIdx = 0

describe('AriaPolicyEngine.validate — cache locality', () => {
  bench('same tag repeated (monomorphic — button)', () => {
    engine.validate('button', { 'aria-label': 'close' })
  })
  bench('rotating tags (polymorphic — 6 tags)', () => {
    engine.validate(ROTATING_TAGS[rotatingIdx++ % ROTATING_TAGS.length]!, { 'aria-label': 'close' })
  })
})

// Isolates startsWith('aria-') key scan + Set.has + Map.get costs per key.
// Object.keys() allocates; the per-key checks are the hot loop body.
describe('AriaPolicyEngine — key scan microbenchmark (attr-only cost)', () => {
  bench('scan 5 aria keys (typical component)', () => {
    AriaPolicyEngine.evaluate('button', {
      'aria-label': 'x',
      'aria-expanded': 'false',
      'aria-controls': 'menu',
      'aria-haspopup': 'true',
      'aria-pressed': 'false',
    })
  })
  bench('scan 20 aria keys (dense component)', () => {
    AriaPolicyEngine.evaluate('button', HEAVY_ARIA_ALL_VALID)
  })
  bench('scan 30 keys mixed (aria + non-aria, enterprise scale)', () => {
    AriaPolicyEngine.evaluate('button', HEAVY_ARIA_WITH_VIOLATIONS)
  })
})
