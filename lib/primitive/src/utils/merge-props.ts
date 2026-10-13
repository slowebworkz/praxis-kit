import type { AnyRecord } from '../types'
import type { Simplify } from 'type-fest'
import { isNil } from 'guardz'

type MergedProps<T extends AnyRecord, P extends AnyRecord> = Simplify<Omit<Partial<T>, keyof P> & P>

/**
 * Merges `options.defaults` with the caller's actual props, caller winning on collision — except
 * a key the caller passed with an explicit `null`/`undefined` value does *not* override a real
 * default. A plain `{...defaultProps, ...props}` spread can't make that distinction: an own key
 * equal to `undefined` (trivially produced by `<Button size={cond ? 'lg' : undefined} />`, or by
 * forwarding a destructured/optional-chained value through an intermediate `{...rest}` spread)
 * looks identical, structurally, to a key the caller deliberately set to `undefined` to clear it —
 * but the former is far more common in real app code and silently losing a configured default to
 * it, with no warning, is the worse failure mode of the two. `Object.hasOwn` alone can't tell them
 * apart either (both are "own, value `undefined`"); this runs on every render of every component
 * in every adapter, so the choice has to be made once, centrally, rather than per call site — see
 * `lib/primitive/src/utils/merge-props.test.ts` for the pinned cases.
 */
export function mergeProps<T extends AnyRecord, P extends AnyRecord>(
  defaultProps: Partial<T> | undefined,
  props: P,
): MergedProps<T, P> {
  const merged: AnyRecord = { ...(defaultProps ?? {}) }
  for (const key in props) {
    if (Object.hasOwn(props, key) && !isNil(props[key])) merged[key] = props[key]
  }
  return merged as MergedProps<T, P>
}
