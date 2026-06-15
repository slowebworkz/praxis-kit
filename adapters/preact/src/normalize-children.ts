import { isValidElement } from 'preact'
import type { AnyVNode } from './types/primitives'

export function normalizeChildren(children: unknown): AnyVNode[] {
  if (isValidElement(children)) return [children as AnyVNode]
  if (Array.isArray(children)) return children.filter(isValidElement) as AnyVNode[]
  return []
}
