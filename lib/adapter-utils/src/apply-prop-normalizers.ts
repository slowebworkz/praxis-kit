import type { AnyRecord, PropNormalizer } from '@praxis-kit/core'
import { getHtmlPropNormalizers } from '@praxis-kit/core'

/**
 * Applies HTML built-in prop normalizers for the active tag, followed by any
 * consumer-supplied enforcement.props normalizers.
 *
 * Shared across all adapters — do not duplicate this in individual adapter render paths.
 */
export function applyPropNormalizers(
  tag: string,
  props: AnyRecord,
  additional?: readonly PropNormalizer[],
): AnyRecord {
  const normalizers = [...(getHtmlPropNormalizers(tag) ?? []), ...(additional ?? [])]
  if (normalizers.length === 0) return props
  return normalizers.reduce<AnyRecord>((acc, fn) => ({ ...acc, ...fn(acc) }), props)
}
