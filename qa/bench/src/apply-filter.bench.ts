// applyFilter hot-path benchmark
//
// Core question: is the per-key FilterPredicate invocation inside applyFilter
// a measurable cost compared to the property iteration itself?
//
// The fast-path proposal: pass a null sentinel instead of a closure when there
// is no user filterProps, and dispatch directly on Set.has inside applyFilter,
// eliminating one function call per key. Worth doing only if this bench shows
// the predicate call is a meaningful fraction of the hot path.
//
// What this bench measures:
//   for...in iteration, Object.hasOwn, Set.has, object writes, and one predicate
//   call per key. Filters are created outside the bench loop — closure creation
//   cost is NOT measured (intentional: the factory runs once per component, not
//   per render).
//
// Findings (M2 Pro, Node 24):
//   5 props,  default filter  → 2.7M hz (0.4 µs/call)
//   15 props, default filter  → 1.0M hz (1.0 µs/call)
//   30 props, default filter  →  279K hz (3.6 µs/call, ±25%)
//   15 props, composed filter → 1.1M hz (0.9 µs/call)
//   30 props, composed filter →  562K hz (1.8 µs/call)
//
// The 30-prop result (default 2× slower than composed) is a workload confound,
// not evidence of closure overhead. The composed filter early-exits on
// data-praxis-* keys, producing fewer output object writes — a different
// workload, not a slower predicate. Do not read this as "more closures = faster."
//
// Conclusion: predicate invocation is not a dominant cost at any realistic
// prop count. for...in, object writes, and Set.has dominate. Introducing a
// null-sentinel fast path would add a branch and extra code path for savings
// well within run-to-run variance. Fast path not justified.
//
// Run via `pnpm bench` (vitest.bench.config.ts).

import { bench, describe } from 'vitest'
import { applyFilter, composeFilter } from '@praxis-kit/adapter-utils'

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
