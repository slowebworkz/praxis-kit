/**
 * Validation-plan cache machinery for `AriaPolicyEngine`: computing a cache key from a
 * (tag, props) usage site, and diffing/replaying the props transformation a validation pass
 * produced (an {@link AriaPlan}'s `removals`/`updates`) without re-running the ARIA rule
 * pipeline itself. Extracted because these four functions are a cohesive subsystem in their own
 * right — a small revalidation-caching scheme — not specifically ARIA *policy*; the actual
 * cache storage (an `LRUCache` instance) stays owned by `AriaPolicyEngine` itself, since it's
 * per-engine-instance state, not something this module needs to hold.
 */
import { isDefined, isNonNull, isNumber, isString, iterate } from '@praxis-kit/primitive'
import type { AnyRecord } from '@praxis-kit/primitive'
import type { AnyTag, AriaRule, IntrinsicProps } from '../types'

/**
 * Cache key covering only the aria-relevant subset of props (tag + role + aria-* attrs) —
 * exactly what the built-in pipeline reads. Non-aria props (className, onClick, etc.) do
 * not affect built-in ARIA decisions and are excluded so cache hits survive re-renders
 * that only change non-aria props. This key alone is unsound for a policy engine's own
 * extra rules, which may read arbitrary props outside this set — extend it with
 * {@link extraRulesKeySuffix}, or bypass the cache, to account for that.
 *
 * Returns `null` (meaning "don't cache") when `tag` isn't a plain intrinsic string tag —
 * `isString(tag)` inline rather than importing `AriaPolicyEngine`'s own `isIntrinsicTag`: the
 * check is a one-liner, and importing it back from the engine module would be a needless
 * dependency in the other direction for a plan-cache module the engine itself depends on.
 */
export function createPlanKey(tag: AnyTag, props: IntrinsicProps): string | null {
  if (!isString(tag)) return null
  const parts: string[] = [tag]
  if (isString(props.role)) parts.push(`role:${props.role}`)
  // input's implicit role depends on type — include it so different types never share a cache entry
  if (tag === 'input' && isString(props.type)) parts.push(`type:${props.type}`)
  // img's implicit role depends on whether alt is empty (none) or non-empty (img)
  if (tag === 'img') parts.push(`alt:${props.alt === '' ? 'empty' : 'present'}`)
  const ariaEntries: string[] = []
  iterate.forEachEntry(props, (k, v) => {
    if (!k.startsWith('aria-')) return
    // Skip non-primitive values — String([object Object]) would produce colliding keys.
    if (!isString(v) && !isNumber(v) && typeof v !== 'boolean') return
    ariaEntries.push(`${k}:${String(v)}`)
  })
  if (ariaEntries.length > 0) parts.push(...ariaEntries.sort())
  return parts.join('|')
}

/**
 * Extends the base cache key with the props each extra rule declares it reads (`readsProps`).
 * Returns `null` — meaning "don't cache" — if any extra rule omits `readsProps` (it may read
 * arbitrary props the key can't account for) or if a declared prop's value isn't a primitive
 * (object/array identity isn't stably representable in a string key).
 */
export function extraRulesKeySuffix(
  extraRules: readonly AriaRule[],
  props: IntrinsicProps,
): string | null {
  const parts: string[] = []
  for (const rule of extraRules) {
    const readsProps = rule.readsProps
    if (!isNonNull(readsProps)) return null
    for (const propKey of readsProps) {
      const v = (props as AnyRecord)[propKey]
      if (isDefined(v) && !isString(v) && !isNumber(v) && typeof v !== 'boolean') return null
      parts.push(`x:${propKey}:${String(v)}`)
    }
  }
  return parts.sort().join('|')
}

/** Diffs a validation pass's input/output props into a replayable plan: which keys were removed
 *  entirely, and which keys were added or changed value (and to what). */
export function computePlan(
  inputProps: IntrinsicProps,
  resultProps: IntrinsicProps,
): { removals: ReadonlySet<string>; updates: Readonly<AnyRecord> } {
  const removals = new Set<string>()
  const updates: AnyRecord = {}
  iterate.forEachKey(inputProps, (key) => {
    if (!(key in (resultProps as object))) removals.add(key)
  })
  iterate.forEachEntry(resultProps, (key, resultVal) => {
    // Capture both new keys (additions) and changed values (modifications).
    if ((inputProps as AnyRecord)[key] !== resultVal) updates[key] = resultVal
  })
  return { removals, updates }
}

/** Replays a cached plan's removals/updates against a fresh `props` object, without re-running
 *  the rule pipeline that originally produced the plan. */
export function applyPlan<T extends IntrinsicProps>(
  props: T,
  removals: ReadonlySet<string>,
  updates: Readonly<AnyRecord>,
): T {
  const hasRemovals = removals.size > 0
  const hasUpdates = Object.keys(updates).length > 0
  if (!hasRemovals && !hasUpdates) return props
  const next: AnyRecord = {}
  iterate.forEachEntry(props, (k, v) => {
    if (!removals.has(k)) next[k] = v
  })
  Object.assign(next, updates)
  return next as unknown as T
}
