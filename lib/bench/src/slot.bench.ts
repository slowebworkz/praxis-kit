import { bench, describe } from 'vitest'
import { createElement, cloneElement, Fragment } from 'react'
import type { ReactElement } from 'react'

import type { AnyRecord } from '@praxis-ui/core'
import { mergeProps } from '@/shared/slot/mergeProps'
import { applySlot } from '@/shared/slot/applySlot'
import { Slottable } from '@/shared/slot/Slottable'
import { cloneSlotChild } from '@/current/slot/cloneSlotChild'

type AnyFn = (...args: unknown[]) => void

// ─── Radix Slot reference implementation ──────────────────────────────────────
// Inlined from @radix-ui/react-slot source for a stable comparison baseline.
// Structural differences from ours: no clsx (string join), no defaultPrevented
// guard in event chains, handler order is child-then-slot (same as ours).

function radixMergeProps(slotProps: AnyRecord, childProps: AnyRecord): AnyRecord {
  const overrideProps: AnyRecord = { ...childProps }
  for (const propName in childProps) {
    const slotVal = slotProps[propName]
    const childVal = childProps[propName]
    if (/^on[A-Z]/.test(propName)) {
      if (slotVal && childVal) {
        overrideProps[propName] = (...args: unknown[]) => {
          ;(childVal as AnyFn)(...args)
          ;(slotVal as AnyFn)(...args)
        }
      } else if (slotVal) {
        overrideProps[propName] = slotVal
      }
    } else if (propName === 'style') {
      overrideProps[propName] = { ...(slotVal as object), ...(childVal as object) }
    } else if (propName === 'className') {
      overrideProps[propName] = [slotVal, childVal].filter(Boolean).join(' ')
    }
  }
  return { ...slotProps, ...overrideProps }
}

// ─── Prop fixtures ─────────────────────────────────────────────────────────────

const SLOT_SIMPLE: AnyRecord = { id: 'slot', 'data-type': 'btn', tabIndex: 0 }
const CHILD_SIMPLE: AnyRecord = { id: 'child', 'data-label': 'click me', 'aria-pressed': false }

const SLOT_CLASS: AnyRecord = { className: 'btn btn--base', id: 'slot' }
const CHILD_CLASS: AnyRecord = { className: 'btn--primary', id: 'child' }

const noop = () => void 0
const SLOT_EVENT: AnyRecord = { onClick: noop, id: 'slot' }
const CHILD_EVENT: AnyRecord = { onClick: noop, id: 'child' }

const SLOT_MIXED: AnyRecord = {
  className: 'btn btn--base',
  style: { color: 'red', fontWeight: 'bold' },
  onClick: noop,
  'data-slot': true,
}
const CHILD_MIXED: AnyRecord = {
  className: 'btn--primary',
  style: { color: 'blue', fontSize: '16px' },
  onClick: noop,
  'data-child': true,
  id: 'target',
}

// Simulates a design-system component with a large accumulated prop surface:
// accessibility, analytics, telemetry, feature flags, motion — each system
// that attaches props grows the iteration cost linearly.
const SLOT_DEEP: AnyRecord = {
  className: 'btn btn--base btn--lg',
  style: { color: 'red', fontWeight: 'bold', display: 'inline-flex' },
  onClick: noop,
  onMouseEnter: noop,
  onMouseLeave: noop,
  onFocus: noop,
  onBlur: noop,
  'aria-label': 'Submit form',
  'aria-describedby': 'hint-1',
  'aria-disabled': false,
  'aria-pressed': false,
  'data-analytics-id': 'btn-submit',
  'data-analytics-zone': 'checkout',
  'data-testid': 'submit-btn',
  'data-feature-flag': 'new-checkout',
  'data-motion-safe': true,
  tabIndex: 0,
  role: 'button',
  type: 'submit',
}
const CHILD_DEEP: AnyRecord = {
  className: 'btn--primary btn--rounded',
  style: { color: 'blue', padding: '8px 16px', borderRadius: '4px' },
  onClick: noop,
  onMouseEnter: noop,
  onKeyDown: noop,
  onKeyUp: noop,
  'aria-label': 'Place order',
  'aria-live': 'polite',
  'data-analytics-label': 'place-order',
  'data-analytics-experiment': 'checkout-v2',
  'data-telemetry-event': 'cta_click',
  'data-testid': 'place-order-btn',
  'data-motion-reduce': false,
  id: 'place-order',
  name: 'action',
  disabled: false,
  form: 'checkout-form',
  value: 'submit',
}

// ─── Element fixtures ──────────────────────────────────────────────────────────

const SIMPLE_EL: ReactElement = createElement('div', CHILD_SIMPLE as Record<string, unknown>)
const CLASS_EVENT_EL: ReactElement = createElement('button', {
  className: 'btn--base',
  onClick: noop,
})
// Fragment child: bypasses ref composition in cloneSlotChild
const FRAG_EL: ReactElement = createElement(Fragment, null, createElement('span', null, 'content'))
const SLOTTABLE_CHILD: ReactElement = createElement(
  Slottable,
  null,
  createElement('button', { className: 'btn' }),
)

// ─── mergeProps ────────────────────────────────────────────────────────────────

describe('mergeProps — simple props (all child-wins)', () => {
  bench('mergeProps', () => {
    mergeProps(SLOT_SIMPLE, CHILD_SIMPLE)
  })
  bench('radix-style (reference)', () => {
    radixMergeProps(SLOT_SIMPLE, CHILD_SIMPLE)
  })
})

describe('mergeProps — className (clsx vs join)', () => {
  bench('mergeProps', () => {
    mergeProps(SLOT_CLASS, CHILD_CLASS)
  })
  bench('radix-style (reference)', () => {
    radixMergeProps(SLOT_CLASS, CHILD_CLASS)
  })
})

// Handler stability is the primary churn source in polymorphic trees. Even with
// stable inputs, mergeProps always allocates a new composed closure — memoization
// keyed on handler identity is the only way to avoid it. These two groups produce
// a vitest ratio showing the cost gap between the stable and fresh-handler paths.
describe('mergeProps — event chaining (stable handlers, same reference each call)', () => {
  bench('mergeProps', () => {
    mergeProps(SLOT_EVENT, CHILD_EVENT)
  })
  bench('radix-style (reference)', () => {
    radixMergeProps(SLOT_EVENT, CHILD_EVENT)
  })
})

describe('mergeProps — event chaining (fresh handlers, new reference each call)', () => {
  bench('mergeProps', () => {
    mergeProps({ onClick: () => void 0 }, { onClick: () => void 0 })
  })
  bench('radix-style (reference)', () => {
    radixMergeProps({ onClick: () => void 0 }, { onClick: () => void 0 })
  })
})

describe('mergeProps — mixed (className + style + event + data)', () => {
  bench('mergeProps', () => {
    mergeProps(SLOT_MIXED, CHILD_MIXED)
  })
  bench('radix-style (reference)', () => {
    radixMergeProps(SLOT_MIXED, CHILD_MIXED)
  })
})

describe('mergeProps — deep prop surface (design-system scale: ~40 props, 5 handlers)', () => {
  bench('mergeProps', () => {
    mergeProps(SLOT_DEEP, CHILD_DEEP)
  })
  bench('radix-style (reference)', () => {
    radixMergeProps(SLOT_DEEP, CHILD_DEEP)
  })
})

// ─── cloneSlotChild ────────────────────────────────────────────────────────────

describe('cloneSlotChild — simple props', () => {
  bench('cloneSlotChild', () => {
    cloneSlotChild({ child: SIMPLE_EL, slotProps: SLOT_SIMPLE, ref: null })
  })
  bench('cloneElement only (no merge, baseline)', () => {
    cloneElement(SIMPLE_EL, { ...SLOT_SIMPLE })
  })
})

describe('cloneSlotChild — className + event', () => {
  bench('cloneSlotChild', () => {
    cloneSlotChild({ child: CLASS_EVENT_EL, slotProps: SLOT_MIXED, ref: null })
  })
  bench('cloneElement only (no merge, baseline)', () => {
    cloneElement(CLASS_EVENT_EL, { ...SLOT_MIXED })
  })
})

describe('cloneSlotChild — Fragment child (skips ref compose)', () => {
  bench('cloneSlotChild', () => {
    cloneSlotChild({ child: FRAG_EL, slotProps: SLOT_SIMPLE, ref: null })
  })
  bench('cloneElement only (no merge, baseline)', () => {
    cloneElement(FRAG_EL, { ...SLOT_SIMPLE })
  })
})

// Handler stability amplification: mergeProps always allocates a new composed
// closure regardless of input stability. cloneSlotChild layers a new element on
// top. Each asChild boundary in a tree multiplies this cost — a five-deep
// asChild chain with fresh handlers allocates five closures and five elements
// per render even if only one prop changed.
describe('cloneSlotChild — stable handlers (same noop reference)', () => {
  bench('cloneSlotChild', () => {
    cloneSlotChild({ child: CLASS_EVENT_EL, slotProps: SLOT_EVENT, ref: null })
  })
  bench('cloneElement only (no merge, baseline)', () => {
    cloneElement(CLASS_EVENT_EL, { ...SLOT_EVENT })
  })
})

describe('cloneSlotChild — fresh handlers (new reference each call)', () => {
  bench('cloneSlotChild', () => {
    cloneSlotChild({
      child: createElement('button', { className: 'btn', onClick: () => void 0 }),
      slotProps: { onClick: () => void 0, id: 'slot' },
      ref: null,
    })
  })
  bench('cloneElement only (no merge, baseline)', () => {
    cloneElement(createElement('button', { className: 'btn', onClick: () => void 0 }), {
      onClick: () => void 0,
      id: 'slot',
    })
  })
})

// ─── applySlot ─────────────────────────────────────────────────────────────────

describe('applySlot — direct element (no Slottable)', () => {
  bench('applySlot', () => {
    applySlot(SIMPLE_EL, SLOT_SIMPLE, null, cloneSlotChild)
  })
})

describe('applySlot — Slottable-wrapped child (extraction path)', () => {
  bench('applySlot', () => {
    applySlot(SLOTTABLE_CHILD, SLOT_CLASS, null, cloneSlotChild)
  })
})
