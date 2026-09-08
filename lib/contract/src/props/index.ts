import { makeStateNormalizer } from './make-state-normalizer'

export { makeStateNormalizer } from './make-state-normalizer'
export type { StateNormalizerConfig } from './make-state-normalizer'

// The eight built-in state-prop normalizers — one `makeStateNormalizer` config each.
// `expanded` / `pressed` / `selected` use `falseState: 'synthesize'` (a meaningful, AT-announced
// false); the rest omit it. See `make-state-normalizer.ts` and DECISIONS.md.
export const activeProps = makeStateNormalizer({
  state: 'active',
  aria: 'aria-current',
  data: 'data-active',
})
export const disabledProps = makeStateNormalizer({
  state: 'disabled',
  aria: 'aria-disabled',
  data: 'data-disabled',
})
export const expandedProps = makeStateNormalizer({
  state: 'expanded',
  aria: 'aria-expanded',
  data: 'data-expanded',
  falseState: 'synthesize',
})
export const invalidProps = makeStateNormalizer({
  state: 'invalid',
  aria: 'aria-invalid',
  data: 'data-invalid',
})
export const loadingProps = makeStateNormalizer({
  state: 'loading',
  aria: 'aria-busy',
  data: 'data-loading',
})
export const pressedProps = makeStateNormalizer({
  state: 'pressed',
  aria: 'aria-pressed',
  data: 'data-pressed',
  falseState: 'synthesize',
})
export const readonlyProps = makeStateNormalizer({
  state: 'readOnly',
  aria: 'aria-readonly',
  data: 'data-readonly',
})
export const selectedProps = makeStateNormalizer({
  state: 'selected',
  aria: 'aria-selected',
  data: 'data-selected',
  falseState: 'synthesize',
})
