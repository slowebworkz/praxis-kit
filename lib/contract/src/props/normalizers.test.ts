import { describe, expect, it } from 'vitest'
import type { PropNormalizer } from '@praxis-kit/primitive'
import {
  activeProps,
  disabledProps,
  expandedProps,
  invalidProps,
  loadingProps,
  makeStateNormalizer,
  pressedProps,
  readonlyProps,
  selectedProps,
} from './index'

// The eight built-in normalizers, all on the `omit` false-state model (see
// `make-state-normalizer.ts`): a truthy state injects the aria-* / data-* pair, a falsy state
// emits nothing, an explicitly-supplied aria-* / data-* value is never overwritten.
const cases: ReadonlyArray<{
  name: string
  fn: PropNormalizer
  stateKey: string
  ariaKey: string
  dataKey: string
}> = [
  { name: 'disabledProps', fn: disabledProps, stateKey: 'disabled', ariaKey: 'aria-disabled', dataKey: 'data-disabled' }, // prettier-ignore
  { name: 'expandedProps', fn: expandedProps, stateKey: 'expanded', ariaKey: 'aria-expanded', dataKey: 'data-expanded' }, // prettier-ignore
  { name: 'invalidProps', fn: invalidProps, stateKey: 'invalid', ariaKey: 'aria-invalid', dataKey: 'data-invalid' }, // prettier-ignore
  { name: 'loadingProps', fn: loadingProps, stateKey: 'loading', ariaKey: 'aria-busy', dataKey: 'data-loading' }, // prettier-ignore
  { name: 'pressedProps', fn: pressedProps, stateKey: 'pressed', ariaKey: 'aria-pressed', dataKey: 'data-pressed' }, // prettier-ignore
  { name: 'readonlyProps', fn: readonlyProps, stateKey: 'readOnly', ariaKey: 'aria-readonly', dataKey: 'data-readonly' }, // prettier-ignore
  { name: 'selectedProps', fn: selectedProps, stateKey: 'selected', ariaKey: 'aria-selected', dataKey: 'data-selected' }, // prettier-ignore
  { name: 'activeProps', fn: activeProps, stateKey: 'active', ariaKey: 'aria-current', dataKey: 'data-active' }, // prettier-ignore
]

describe.each(cases)('$name', ({ fn, stateKey, ariaKey, dataKey }) => {
  it('injects the aria-* / data-* pair when the state is truthy', () => {
    expect(fn({ [stateKey]: true })).toEqual({ [ariaKey]: 'true', [dataKey]: '' })
  })

  it('emits nothing when the state is falsy', () => {
    expect(fn({ [stateKey]: false })).toEqual({})
    expect(fn({})).toEqual({})
  })

  it('does not overwrite an explicitly-supplied aria-* value', () => {
    expect(fn({ [stateKey]: true, [ariaKey]: 'false' })).toEqual({ [dataKey]: '' })
  })

  it('does not overwrite an explicitly-supplied data-* value', () => {
    expect(fn({ [stateKey]: true, [dataKey]: 'custom' })).toEqual({ [ariaKey]: 'true' })
  })
})

describe('makeStateNormalizer', () => {
  it('`omit` (default): a falsy state emits nothing', () => {
    const n = makeStateNormalizer({ state: 's', aria: 'aria-x', data: 'data-x' })
    expect(n({ s: false })).toEqual({})
    expect(n({ s: true })).toEqual({ 'aria-x': 'true', 'data-x': '' })
  })

  it('`synthesize`: state=false → aria-*="false"; state absent → nothing', () => {
    const n = makeStateNormalizer({
      state: 's',
      aria: 'aria-x',
      data: 'data-x',
      falseState: 'synthesize',
    })
    expect(n({ s: false })).toEqual({ 'aria-x': 'false' })
    expect(n({ s: null })).toEqual({})
    expect(n({})).toEqual({})
    expect(n({ s: true })).toEqual({ 'aria-x': 'true', 'data-x': '' })
  })

  it('coerces a truthy non-boolean state to "true"', () => {
    const n = makeStateNormalizer({
      state: 's',
      aria: 'aria-x',
      data: 'data-x',
      falseState: 'synthesize',
    })
    expect(n({ s: 1 })).toEqual({ 'aria-x': 'true', 'data-x': '' })
    expect(n({ s: 0 })).toEqual({ 'aria-x': 'false' })
  })
})
