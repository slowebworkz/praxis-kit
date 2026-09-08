import type { PropNormalizer, StringMap } from '@praxis-kit/primitive'
import { isNullish, isUndefined } from '@praxis-kit/primitive'

export interface StateNormalizerConfig {
  /** The sugar prop this normalizer reads, e.g. `expanded` or `readOnly`. */
  readonly state: string
  /** The `aria-*` attribute it derives, e.g. `aria-expanded`. */
  readonly aria: `aria-${string}`
  /** The `data-*` attribute it derives, e.g. `data-expanded`. */
  readonly data: `data-${string}`
  /**
   * The false-state model for this prop (see DECISIONS.md → "prop-normalizer false-state model"):
   *
   * - **`omit`** (default) — a falsy state emits nothing. Correct where `aria-*="false"` equals
   *   the attribute's default (`aria-disabled`, `aria-invalid`, `aria-busy`, `aria-readonly`,
   *   `aria-current`), so deriving it would be redundant.
   * - **`synthesize`** — `state={false}` produces `aria-*="false"`, because an absent attribute
   *   ("not expandable / not a toggle / not selectable") and `="false"` ("expandable, currently
   *   collapsed") are announced differently by assistive technology. Used for `expanded`,
   *   `pressed`, `selected`.
   *
   * The `data-*` attribute is present-when-true under either model — style a false state via
   * `[aria-*="false"]`.
   */
  readonly falseState?: 'omit' | 'synthesize'
}

/**
 * Builds one of the eight built-in state-prop normalizers. A truthy state injects the `aria-*` /
 * `data-*` pair; the false state is handled per `falseState`; an explicitly supplied `aria-*` /
 * `data-*` value is never overwritten (the normalizer only fills when the key is `undefined`).
 */
export function makeStateNormalizer({
  state,
  aria,
  data,
  falseState = 'omit',
}: StateNormalizerConfig): PropNormalizer {
  return (props) => {
    const value = props[state]
    const absent = falseState === 'synthesize' ? isNullish(value) : !value
    if (absent) return {}

    const out: StringMap<string> = {}
    if (isUndefined(props[aria])) out[aria] = value ? 'true' : 'false'
    if (value && isUndefined(props[data])) out[data] = ''
    return out
  }
}
