// applyFilter hot-path benchmark
//
// Core question: is the FilterPredicate closure overhead in applyFilter
// measurable on a realistic per-render prop object?
//
// Scenarios:
//   - Default filter only (no user filterProps) — the common case
//   - Default filter + user filterProps — the composed case
//   - Varying prop counts (5, 15, 30) to model Box, Button, and a rich component
//
// The fast-path proposal: pass a null sentinel instead of a closure when there
// is no user filterProps, and dispatch directly in applyFilter. Worth doing only
// if this bench shows the closure call is a meaningful fraction of the hot path.
//
// Findings (M2 Pro, node 24):
//   5 props,  default filter  → 2.7M hz (0.4 µs/call)
//   15 props, default filter  → 1.0M hz (1.0 µs/call)
//   30 props, default filter  →  279K hz (3.6 µs/call, ±25% — prop iteration dominates)
//   15 props, composed filter → 1.1M hz (0.9 µs/call)
//   30 props, composed filter →  562K hz (1.8 µs/call)
//
// The closure overhead is not measurable — prop iteration cost dominates at all
// sizes. The composed filter at 30 props is faster than the default (early-exit
// on data-praxis- keys changes iteration behavior). Fast path not justified.
//
// Run via `pnpm bench` (vitest.bench.config.ts).

import { bench, describe } from 'vitest'
import { applyFilter, composeFilter } from '@praxis-ui/adapter-utils'

const variantKeys = new Set(['size', 'intent', 'tone'])
const ownedKeys = new Set(['flex', 'grid', 'direction', 'gap', 'align', 'justify'])

const defaultFilter = composeFilter(ownedKeys)
const composedFilter = composeFilter(ownedKeys, (key) => key.startsWith('data-praxis-'))

// ─── Prop fixtures ─────────────────────────────────────────────────────────────

const propsSmall = {
  size: 'md',
  intent: 'primary',
  className: 'my-btn',
  onClick: () => {},
  children: null,
}

const propsMedium = {
  size: 'md',
  intent: 'primary',
  tone: 'neutral',
  flex: true,
  gap: 'md',
  className: 'my-box',
  onClick: () => {},
  onFocus: () => {},
  onBlur: () => {},
  'aria-label': 'button',
  'aria-disabled': false,
  id: 'btn-1',
  tabIndex: 0,
  role: 'button',
  style: {},
}

const propsLarge = {
  ...propsMedium,
  direction: 'row',
  align: 'center',
  justify: 'between',
  grid: false,
  'data-state': 'active',
  'data-praxis-id': 'x',
  'data-testid': 'btn',
  type: 'button',
  disabled: false,
  form: undefined,
  name: 'submit',
  value: '1',
  draggable: false,
  spellCheck: false,
}

// ─── Benchmarks ───────────────────────────────────────────────────────────────

describe('applyFilter — 5 props, default filter', () => {
  bench('default filter (closure)', () => {
    applyFilter(propsSmall, defaultFilter, variantKeys)
  })
})

describe('applyFilter — 15 props, default filter', () => {
  bench('default filter (closure)', () => {
    applyFilter(propsMedium, defaultFilter, variantKeys)
  })
})

describe('applyFilter — 30 props, default filter', () => {
  bench('default filter (closure)', () => {
    applyFilter(propsLarge, defaultFilter, variantKeys)
  })
})

describe('applyFilter — 15 props, composed filter', () => {
  bench('composed filter (two closures)', () => {
    applyFilter(propsMedium, composedFilter, variantKeys)
  })
})

describe('applyFilter — 30 props, composed filter', () => {
  bench('composed filter (two closures)', () => {
    applyFilter(propsLarge, composedFilter, variantKeys)
  })
})
