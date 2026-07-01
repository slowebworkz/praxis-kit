import { Fragment, h } from 'preact'
import type { VNode } from 'preact'
import type { Backend, RenderContext, RuntimeContext, TreeNode } from '@pk2/core'
import { buildPropsFromDecoration } from './build-props'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyVNode = VNode<any>

function renderNode(node: TreeNode, render: RenderContext): AnyVNode {
  const children = node.children.map((child) => renderNode(child, render))

  if (node.kind === 'component') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return h(Fragment as any, { key: node.id }, ...children)
  }

  const decoration = render.decoration.get(node.id)
  const props = buildPropsFromDecoration(node.id, decoration)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return h(node.tag as any, props as any, ...children)
}

export const preactBackend: Backend<AnyVNode> = {
  render(context: RuntimeContext): AnyVNode {
    return renderNode(context.tree.root, context.render)
  },
}
