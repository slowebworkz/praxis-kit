import { describe, expect, it } from 'vitest'

import { AriaPolicyEngine } from './polymorphic-validator'
import { silentDiagnostics } from '@praxis-kit/diagnostics'

// ---------------------------------------------------------------------------
// Randomized (fuzz) testing over role/tag/attribute/value combinations.
//
// The hand-written suites elsewhere in this directory pin specific, known
// combinations. This file instead generates a large number of combinations —
// most of them nonsensical, which is the point — and checks properties that
// must hold no matter what props come in, rather than a specific expected
// output. A fixed seed keeps every run byte-for-byte identical, so a failure
// is always reproducible and CI never flakes on this file.
// ---------------------------------------------------------------------------

// Mulberry32 — small, fast, deterministic PRNG. Not cryptographic; only used
// to generate reproducible test inputs.
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!
}

const TAGS = [
  'div',
  'span',
  'nav',
  'main',
  'aside',
  'header',
  'footer',
  'article',
  'section',
  'form',
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'fieldset',
  'dialog',
  'progress',
  'output',
  'img',
  'h1',
  'h2',
  'h3',
] as const

const INPUT_TYPES = ['text', 'checkbox', 'radio', 'range', 'number', 'hidden', undefined] as const

const ROLES = [
  undefined,
  '',
  'navigation',
  'region',
  'banner',
  'button',
  'checkbox',
  'dialog',
  'combobox',
  'option',
  'slider',
  'scrollbar',
  'spinbutton',
  'alert',
  'status',
  'log',
  'timer',
  'none',
  'presentation',
  'img',
  'columnheader',
  'not-a-real-role',
] as const

const ARIA_KEYS = [
  'aria-checked',
  'aria-pressed',
  'aria-expanded',
  'aria-hidden',
  'aria-level',
  'aria-valuenow',
  'aria-selected',
  'aria-live',
  'aria-relevant',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
  'aria-sort',
  'aria-haspopup',
  'aria-autocomplete',
  'aria-atomic',
] as const

const ARIA_VALUES = [
  'true',
  'false',
  'mixed',
  '0',
  '1',
  '-1',
  '3',
  '50',
  'fifty',
  'ascending',
  'polite',
  'assertive',
  'eager',
  'all',
  'additions bogus',
  '',
  'some-id',
  true,
  false,
  50,
] as const

function randomProps(rng: () => number): Record<string, unknown> {
  const props: Record<string, unknown> = {}
  const role = pick(rng, ROLES)
  if (role !== undefined) props.role = role

  const attrCount = Math.floor(rng() * 4)
  for (let i = 0; i < attrCount; i++) {
    props[pick(rng, ARIA_KEYS)] = pick(rng, ARIA_VALUES)
  }

  if (rng() < 0.3) props.alt = rng() < 0.5 ? '' : 'a description'
  if (rng() < 0.3) props.tabindex = pick(rng, ['0', '-1', '3'])
  if (rng() < 0.2) props.className = 'some-class'

  return props
}

const ITERATIONS = 500
const SEED = 0x5eed_5eed

describe('AriaPolicyEngine — randomized fuzz coverage', () => {
  it('never throws under silentDiagnostics for any random tag/type/role/attribute combination', () => {
    const rng = mulberry32(SEED)
    for (let i = 0; i < ITERATIONS; i++) {
      const tag = pick(rng, TAGS)
      const props = randomProps(rng)
      if (tag === 'input') props.type = pick(rng, INPUT_TYPES)

      const engine = new AriaPolicyEngine(silentDiagnostics)
      expect(
        () => engine.validate(tag, props),
        `tag=${tag} props=${JSON.stringify(props)}`,
      ).not.toThrow()
    }
  })

  it('reaches a fixed point: re-validating already-fixed props produces no further prop changes', () => {
    const rng = mulberry32(SEED + 1)
    for (let i = 0; i < ITERATIONS; i++) {
      const tag = pick(rng, TAGS)
      const props = randomProps(rng)
      if (tag === 'input') props.type = pick(rng, INPUT_TYPES)

      // Fresh engine each time so the second call is a real re-evaluation, not a cache hit.
      const first = new AriaPolicyEngine(silentDiagnostics).validate(tag, props)

      // Known, documented exception (see #checkMissingLiveRegion): all rules in a pass evaluate
      // against the same pre-fix snapshot, so an *invalid* aria-live value both gets stripped by
      // #checkAriaAttributeValues and (in the same pass) suppresses #checkMissingLiveRegion's
      // injection, since that check only sees the key was present, not that its value was bad.
      // The correct value gets injected one pass later. Not a fixed point in one call, by design.
      const hadInvalidAriaLiveStripped = 'aria-live' in props && !('aria-live' in first.props)
      if (hadInvalidAriaLiveStripped) continue

      const second = new AriaPolicyEngine(silentDiagnostics).validate(tag, first.props)

      expect(
        second.props,
        `tag=${tag} original=${JSON.stringify(props)} afterFirst=${JSON.stringify(first.props)}`,
      ).toEqual(first.props)
    }
  })

  it('returns identical violations for the same (tag, props) pair on a cache hit, across the full input space', () => {
    const rng = mulberry32(SEED + 2)
    const engine = new AriaPolicyEngine(silentDiagnostics)
    for (let i = 0; i < ITERATIONS; i++) {
      const tag = pick(rng, TAGS)
      const props = randomProps(rng)
      if (tag === 'input') props.type = pick(rng, INPUT_TYPES)

      const first = engine.validate(tag, props)
      const second = engine.validate(tag, props)
      expect(second.violations, `tag=${tag} props=${JSON.stringify(props)}`).toEqual(
        first.violations,
      )
    }
  })
})
