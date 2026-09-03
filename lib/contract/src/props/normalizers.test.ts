import { describe, expect, it } from 'vitest'
import type { PropNormalizer } from '@praxis-kit/primitive'
import {
  activeProps,
  disabledProps,
  expandedProps,
  invalidProps,
  loadingProps,
  pressedProps,
  readonlyProps,
  selectedProps,
} from './index'

// Pins the current "Model A" behavior (see DECISIONS.md → "contract prop-normalizer false-state
// model"): a truthy state injects the aria-* / data-* pair, a falsy state emits nothing, and an
// explicitly-supplied aria-* / data-* value is never overwritten. If the false-state model is
// revisited at factory integration, the change should show up as a diff here.
const cases: ReadonlyArray<{
  name: string
  fn: PropNormalizer
  stateKey: string
  ariaKey: string
  ariaValue: string
  dataKey: string
}> = [
  {
    name: 'disabledProps',
    fn: disabledProps,
    stateKey: 'disabled',
    ariaKey: 'aria-disabled',
    ariaValue: 'true',
    dataKey: 'data-disabled',
  },
  {
    name: 'expandedProps',
    fn: expandedProps,
    stateKey: 'expanded',
    ariaKey: 'aria-expanded',
    ariaValue: 'true',
    dataKey: 'data-expanded',
  },
  {
    name: 'invalidProps',
    fn: invalidProps,
    stateKey: 'invalid',
    ariaKey: 'aria-invalid',
    ariaValue: 'true',
    dataKey: 'data-invalid',
  },
  {
    name: 'loadingProps',
    fn: loadingProps,
    stateKey: 'loading',
    ariaKey: 'aria-busy',
    ariaValue: 'true',
    dataKey: 'data-loading',
  },
  {
    name: 'pressedProps',
    fn: pressedProps,
    stateKey: 'pressed',
    ariaKey: 'aria-pressed',
    ariaValue: 'true',
    dataKey: 'data-pressed',
  },
  {
    name: 'readonlyProps',
    fn: readonlyProps,
    stateKey: 'readOnly',
    ariaKey: 'aria-readonly',
    ariaValue: 'true',
    dataKey: 'data-readonly',
  },
  {
    name: 'selectedProps',
    fn: selectedProps,
    stateKey: 'selected',
    ariaKey: 'aria-selected',
    ariaValue: 'true',
    dataKey: 'data-selected',
  },
  {
    name: 'activeProps',
    fn: activeProps,
    stateKey: 'active',
    ariaKey: 'aria-current',
    ariaValue: 'true',
    dataKey: 'data-active',
  },
]

describe.each(cases)('$name', ({ fn, stateKey, ariaKey, ariaValue, dataKey }) => {
  it('injects the aria-* / data-* pair when the state is truthy', () => {
    expect(fn({ [stateKey]: true })).toEqual({ [ariaKey]: ariaValue, [dataKey]: '' })
  })

  it('emits nothing when the state is falsy', () => {
    expect(fn({ [stateKey]: false })).toEqual({})
    expect(fn({})).toEqual({})
  })

  it('does not overwrite an explicitly-supplied aria-* value', () => {
    expect(fn({ [stateKey]: true, [ariaKey]: 'false' })).toEqual({ [dataKey]: '' })
  })

  it('does not overwrite an explicitly-supplied data-* value', () => {
    expect(fn({ [stateKey]: true, [dataKey]: 'custom' })).toEqual({ [ariaKey]: ariaValue })
  })
})
