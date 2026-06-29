import type { Backend, RenderContext, RuntimeContext, TreeNode, NodeDecoration } from '@pk2/core'
import { isObject, iterate } from '@praxis-kit/primitive'

interface RefObject<T> {
  current: T | null
}

function eventName(prop: string): string {
  return prop.slice(2).toLowerCase()
}

function applyDecoration(el: HTMLElement, decoration: NodeDecoration | undefined): void {
  if (!decoration) return

  const { attributes, styles, listeners, ref } = decoration

  iterate.forEach(Object.entries(attributes ?? {}), ([k, v]) => {
    el.setAttribute(k, String(v))
  })
  if (styles !== undefined) {
    Object.assign(el.style, styles)
  }
  iterate.forEach(Object.entries(listeners ?? {}), ([k, fn]) => {
    el.addEventListener(eventName(k), fn as EventListener)
  })
  if (ref !== undefined) {
    if (typeof ref === 'function') (ref as (el: Element) => void)(el)
    else if (isObject(ref)) (ref as RefObject<Element>).current = el
  }
}

function renderNode(node: TreeNode, render: RenderContext): Node {
  if (node.kind === 'component') {
    const frag = document.createDocumentFragment()
    iterate.forEach(node.children, (child) => {
      frag.appendChild(renderNode(child, render))
    })
    return frag
  }

  const el = document.createElement(node.tag)
  applyDecoration(el, render.decoration.get(node.id))
  iterate.forEach(node.children, (child) => {
    el.appendChild(renderNode(child, render))
  })
  return el
}

export const webBackend: Backend<Node> = {
  render(context: RuntimeContext): Node {
    return renderNode(context.tree.root, context.render)
  },
}
