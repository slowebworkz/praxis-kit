import React from 'react'
import type { Backend, RenderContext, RuntimeContext, TreeNode } from '@praxis-kit/runtime'
import { buildPropsFromDecoration } from './build-props'

function renderNode(node: TreeNode, render: RenderContext): React.ReactElement {
  const children = node.children.map((child) => renderNode(child, render))

  if (node.kind === 'component') {
    return React.createElement(React.Fragment, { key: node.id }, ...children)
  }

  const decoration = render.decoration.get(node.id)
  const props = buildPropsFromDecoration(node.id, decoration)

  return React.createElement(node.tag, props, ...children)
}

export const reactBackend: Backend<React.ReactElement> = {
  render(context: RuntimeContext): React.ReactElement {
    return renderNode(context.tree.root, context.render)
  },
}
