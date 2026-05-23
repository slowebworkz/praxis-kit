import { bench, describe } from 'vitest'
import { AriaPolicyEngine } from '@polymorphic-ui/core'

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
