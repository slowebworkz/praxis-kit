import type { ComponentIdentity } from '@pk2/core'
import type {
  AnyRecord,
  CapabilityMap,
  Diagnostic,
  MetadataMap,
  SlotName,
  VariantMap,
} from '@pk2/foundation'
import { isObject } from '@pk2/foundation'
import type { MergeStrategy } from '@pk2/merge'
import type { CompilerContext } from './types'

// ─── Domain merge functions ───────────────────────────────────────────────────

export function identityMerge(
  prev: Partial<ComponentIdentity>,
  next: Partial<ComponentIdentity> | undefined,
): Partial<ComponentIdentity> {
  return { ...prev, ...next }
}

/**
 * Monotonic capability merge: truthy capability values cannot be revoked.
 * Once a key is truthy, later passes cannot unset it — order independent.
 */
export function capabilityMerge(
  prev: CapabilityMap,
  next: CapabilityMap | undefined,
): CapabilityMap {
  if (next === undefined) return prev
  const result: CapabilityMap = { ...prev }
  for (const [key, value] of Object.entries(next)) {
    if (!result[key]) result[key] = value
  }
  return result
}

function deepMergeRecord(prev: AnyRecord, next: AnyRecord): AnyRecord {
  const result: AnyRecord = { ...prev }
  for (const [key, value] of Object.entries(next)) {
    const existing = result[key]
    result[key] = isObject(existing) && isObject(value) ? deepMergeRecord(existing, value) : value
  }
  return result
}

/**
 * Recursive metadata merge: nested plain objects are deep-merged so separate
 * passes can write to disjoint sub-keys (e.g. `docs.summary` and
 * `docs.examples`) without clobbering each other. Arrays and primitives:
 * later pass wins.
 */
export function metadataMerge(prev: MetadataMap, next: MetadataMap | undefined): MetadataMap {
  return next !== undefined ? deepMergeRecord(prev, next) : prev
}

export function diagnosticMerge(prev: Diagnostic[], next: Diagnostic[] | undefined): Diagnostic[] {
  return next !== undefined ? [...prev, ...next] : prev
}

/**
 * Slot accumulation: later passes append; no deduplication so duplicate
 * declarations are preserved for a future conflict-detection pass.
 */
export function slotMerge(
  prev: readonly SlotName[] | undefined,
  next: readonly SlotName[] | undefined,
): readonly SlotName[] | undefined {
  if (prev === undefined && next === undefined) return undefined
  return [...(prev ?? []), ...(next ?? [])]
}

/**
 * Variant union merge: per variant key, values from all passes are unioned
 * (deduplicated). A later pass declaring `size: ['xl']` when a previous pass
 * already declared `size: ['sm', 'lg']` produces `size: ['sm', 'lg', 'xl']`
 * rather than replacing the group.
 */
export function variantMerge(
  prev: VariantMap | undefined,
  next: VariantMap | undefined,
): VariantMap | undefined {
  if (prev === undefined && next === undefined) return undefined
  const a = prev ?? {}
  const b = next ?? {}
  const result: VariantMap = { ...a }
  for (const [key, values] of Object.entries(b)) {
    const existing = result[key]
    result[key] = existing !== undefined ? [...new Set([...existing, ...values])] : [...values]
  }
  return result
}

// ─── Strategy ─────────────────────────────────────────────────────────────────

export const compilerMergeStrategy: MergeStrategy<CompilerContext> = {
  merge(previous, incoming) {
    const { identity, capabilities, metadata, diagnostics, slots, variants, ...rest } = incoming

    const mergedSlots = slotMerge(previous.slots, slots)
    const mergedVariants = variantMerge(previous.variants, variants)

    return {
      ...previous,
      ...rest,
      identity: identityMerge(previous.identity, identity),
      capabilities: capabilityMerge(previous.capabilities, capabilities),
      metadata: metadataMerge(previous.metadata, metadata),
      diagnostics: diagnosticMerge(previous.diagnostics, diagnostics),
      ...(mergedSlots !== undefined ? { slots: mergedSlots } : {}),
      ...(mergedVariants !== undefined ? { variants: mergedVariants } : {}),
    }
  },
}
