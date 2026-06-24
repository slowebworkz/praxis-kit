import type { Backend, RenderContext, RuntimeContext, TreeNode } from '@pk2/core'

function renderNode(node: TreeNode, render: RenderContext): Element | DocumentFragment {
  if (node.kind === 'component') {
    const frag = document.createDocumentFragment()
    for (const child of node.children) frag.appendChild(renderNode(child, render))
    return frag as unknown as Element
  }

  const el = document.createElement(node.tag)
  const decoration = render.decoration.get(node.id)

  for (const [k, v] of Object.entries(decoration?.attributes ?? {})) {
    el.setAttribute(k, String(v))
  }
  if (decoration?.styles !== undefined) {
    Object.assign(el.style, decoration.styles)
  }
  for (const [k, fn] of Object.entries(decoration?.listeners ?? {})) {
    el.addEventListener(k.slice(2).toLowerCase(), fn as EventListener)
  }
  const ref = decoration?.ref
  if (ref !== undefined) {
    if (typeof ref === 'function') (ref as (el: Element) => void)(el)
    else if (typeof ref === 'object' && ref !== null) (ref as { current: Element }).current = el
  }

  for (const child of node.children) el.appendChild(renderNode(child, render))

  return el
}

export const webBackend: Backend<Element | DocumentFragment> = {
  render(context: RuntimeContext): Element | DocumentFragment {
    return renderNode(context.tree.root, context.render)
  },
}
