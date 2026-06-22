import { Children, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { NodeId, SlotName } from '@pk2/foundation'
import type { AttributeMap, ListenerMap, NodeDecoration, NodeInput, StyleMap } from '@pk2/core'

export interface AccumulatedTree {
  root: NodeInput
  decoration: Record<NodeId, NodeDecoration>
}

function extractDecoration(props: Record<string, unknown>): NodeDecoration {
  const attributes: AttributeMap = {}
  const styles: StyleMap = {}
  const listeners: ListenerMap = {}
  const variants: Record<string, unknown> = {}
  const dec: NodeDecoration = {}

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'slot' || key === 'ref') continue

    if (key === 'style' && typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value)) {
        if (typeof v === 'string') styles[k] = v
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      listeners[key] = value as ListenerMap[string]
    } else if (typeof value === 'string') {
      attributes[key] = value
    } else if (typeof value === 'boolean') {
      variants[key] = value
    }
  }

  if (Object.keys(attributes).length > 0) dec.attributes = attributes
  if (Object.keys(styles).length > 0) dec.styles = styles
  if (Object.keys(listeners).length > 0) dec.listeners = listeners
  if (Object.keys(variants).length > 0) dec.variants = variants
  if ('ref' in props && props.ref !== undefined) dec.ref = props.ref

  return dec
}

function fromElement(
  element: ReactElement<Record<string, unknown>>,
  id: NodeId,
  decoration: Record<NodeId, NodeDecoration>,
): NodeInput {
  const props = element.props
  const slot = typeof props.slot === 'string' ? (props.slot as SlotName) : undefined

  const children: NodeInput[] = Children.toArray(props.children as ReactNode)
    .map((child, i) => fromNode(child, `${id}-${i}`, decoration))
    .filter((n): n is NodeInput => n !== null)

  const dec = extractDecoration(props)
  if (Object.keys(dec).length > 0) decoration[id] = dec

  if (typeof element.type === 'string') {
    return { kind: 'native', id, tag: element.type, children, ...(slot !== undefined && { slot }) }
  }

  return { kind: 'component', id, children, ...(slot !== undefined && { slot }) }
}

function fromNode(
  node: ReactNode,
  id: NodeId,
  decoration: Record<NodeId, NodeDecoration>,
): NodeInput | null {
  if (!isValidElement(node)) return null
  return fromElement(node as ReactElement<Record<string, unknown>>, id, decoration)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function fromReactElement(element: ReactElement<any>): AccumulatedTree {
  const decoration: Record<NodeId, NodeDecoration> = {}
  const root = fromElement(element, 'root', decoration)
  return { root, decoration }
}
