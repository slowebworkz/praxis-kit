import type { NodeDecoration } from '@praxis-kit/runtime'

export function withAttributes(
  dec: NodeDecoration,
  attributes?: typeof dec.attributes,
): NodeDecoration {
  const { attributes: _a, ...rest } = dec
  return attributes !== undefined ? { ...rest, attributes } : rest
}
