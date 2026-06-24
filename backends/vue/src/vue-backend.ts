import { Fragment, h } from 'vue'
import type { VNode } from 'vue'
import type { Backend, ListenerMap, RenderContext, RuntimeContext, TreeNode } from '@pk2/core'
import { buildPropsFromDecoration } from '@pk2/backend-utils'

// Vue's hyphenate converts onKeyDown → 'key-down' (invalid event name).
// Normalize multi-word camelCase handlers to all-lowercase: onKeyDown → onKeydown.
const MULTI_WORD_EVENT_RE = /^on[A-Z][a-z]+[A-Z]/

function normalizeListenerKeys(listeners: ListenerMap): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k in listeners) {
    out[MULTI_WORD_EVENT_RE.test(k) ? 'on' + k.slice(2).toLowerCase() : k] = listeners[k]
  }
  return out
}

function renderNode(node: TreeNode, render: RenderContext, isRoot: boolean): VNode {
  const children = node.children.map((child) => renderNode(child, render, false))

  if (node.kind === 'component') {
    return h(Fragment, isRoot ? null : { key: node.id }, children)
  }

  const decoration = render.decoration.get(node.id)
  const base = buildPropsFromDecoration(isRoot ? '' : node.id, decoration)
  // Override listeners with Vue-normalized keys; strip the key prop at root
  const { key: _key, ...rest } = base
  const props: Record<string, unknown> = {
    ...(isRoot ? {} : { key: node.id }),
    ...rest,
    ...(decoration?.listeners !== undefined ? normalizeListenerKeys(decoration.listeners) : {}),
  }

  return h(node.tag, props, children.length > 0 ? children : undefined)
}

export const vueBackend: Backend<VNode> = {
  render(context: RuntimeContext): VNode {
    return renderNode(context.tree.root, context.render, true)
  },
}
