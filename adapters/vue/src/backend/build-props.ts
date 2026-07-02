import type { NodeDecoration } from '@praxis-kit/runtime'
import type { AnyRecord } from '@praxis-kit/pipeline'

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
