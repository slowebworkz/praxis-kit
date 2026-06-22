import { Children, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { NodeId, SlotName } from '@pk2/foundation'
import type { NodeDecoration, NodeInput } from '@pk2/core'
import { extractDecoration } from './extract-decoration'

export interface AccumulatedTree {
  root: NodeInput
  decoration: Record<NodeId, NodeDecoration>
}

function childId(parent: NodeId, index: number): NodeId {
  return `${parent}-${index}`
}

function fromNode(
  node: unknown,
  id: NodeId,
  decoration: Record<NodeId, NodeDecoration>,
  variantKeys?: ReadonlySet<string>,
): NodeInput | null {
  if (!isValidElement(node)) return null
  return fromElement(node as ReactElement<Record<string, unknown>>, id, decoration, variantKeys)
}

function fromElement(
  element: ReactElement<Record<string, unknown>>,
  id: NodeId,
  decoration: Record<NodeId, NodeDecoration>,
  variantKeys?: ReadonlySet<string>,
): NodeInput {
  const props = element.props
  const slot = typeof props['slot'] === 'string' ? (props['slot'] as SlotName) : undefined
  const children = fromChildren(props['children'], id, decoration, variantKeys)
  const dec = extractDecoration(props, variantKeys)
  if (Object.keys(dec).length > 0) decoration[id] = dec

  const base = { id, children, ...(slot !== undefined && { slot }) }
  if (typeof element.type === 'string') {
    return { kind: 'native', tag: element.type, ...base }
  }
  return { kind: 'component', ...base }
}

export function fromChildren(
  children: unknown,
  parentId: NodeId,
  decoration: Record<NodeId, NodeDecoration>,
  variantKeys?: ReadonlySet<string>,
): NodeInput[] {
  const array = children === undefined ? [] : Children.toArray(children as ReactNode)
  return array
    .map((child, i) => fromNode(child, childId(parentId, i), decoration, variantKeys))
    .filter((n): n is NodeInput => n !== null)
}

export function fromReactElement(
  element: ReactElement<Record<string, unknown>>,
  variantKeys?: ReadonlySet<string>,
): AccumulatedTree {
  const decoration: Record<NodeId, NodeDecoration> = {}
  return {
    root: fromElement(element, 'root', decoration, variantKeys),
    decoration,
  }
}
