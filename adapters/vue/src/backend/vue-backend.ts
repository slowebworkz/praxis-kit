import { Fragment, h } from 'vue'
import type { VNode } from 'vue'
import type { AnyRecord } from '@praxis-kit/primitive'
import type {
  Backend,
  ListenerMap,
  RenderContext,
  RuntimeContext,
  TreeNode,
} from '@praxis-kit/runtime'
import { buildPropsFromDecoration } from './build-props'

// Vue's hyphenate converts onKeyDown → 'key-down' (invalid event name).
// Normalize multi-word camelCase handlers to all-lowercase: onKeyDown → onKeydown.
const MULTI_WORD_EVENT_RE = /^on[A-Z][a-z]+[A-Z]/

function normalizeListenerKeys(listeners: ListenerMap): AnyRecord {
  const out: AnyRecord = {}
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
  const props: AnyRecord = {
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
