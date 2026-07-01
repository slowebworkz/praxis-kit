import type { NodeDecoration } from '@pk2/core'
import type { AnyRecord } from '@pk2/pipeline'

export function buildPropsFromDecoration(
  id: string,
  decoration: NodeDecoration | undefined,
): AnyRecord {
  return {
    key: id,
    ...decoration?.attributes,
    ...(decoration?.styles !== undefined ? { style: decoration.styles } : {}),
    ...decoration?.listeners,
    ...(decoration?.ref !== undefined ? { ref: decoration.ref } : {}),
  }
}
