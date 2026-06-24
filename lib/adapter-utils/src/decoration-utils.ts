import type { NodeDecoration } from '@pk2/core'

export function withAttributes(
  dec: NodeDecoration,
  attributes?: typeof dec.attributes,
): NodeDecoration {
  const { attributes: _a, ...rest } = dec
  return attributes !== undefined ? { ...rest, attributes } : rest
}
