import { html, unsafeStatic } from 'lit/static-html.js'
import type { TemplateResult, nothing } from 'lit'
import type { Backend, RenderContext, RuntimeContext, TreeNode } from '@pk2/core'

// Lit requires static tag names at compile time; unsafeStatic bridges the gap for
// dynamic tags. Only use with trusted string values — never with user-supplied input.
function renderNode(node: TreeNode, render: RenderContext): TemplateResult | typeof nothing {
  const children = node.children.map((child) => renderNode(child, render))

  if (node.kind === 'component') {
    return html`${children}`
  }

  const decoration = render.decoration.get(node.id)
  const attrs = decoration?.attributes ?? {}
  const tag = unsafeStatic(node.tag)

  const attrParts = Object.entries(attrs)
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(' ')

  // Lit attribute binding via template strings is limited for fully dynamic attrs.
  // The unsafeStatic approach is intentional here — tags come from controlled
  // factory options, never from user input.
  return attrParts.length > 0
    ? html`<${tag} .props=${decoration?.attributes}>${children}</${tag}>`
    : html`<${tag}>${children}</${tag}>`
}

export const litBackend: Backend<TemplateResult | typeof nothing> = {
  render(context: RuntimeContext): TemplateResult | typeof nothing {
    return renderNode(context.tree.root, context.render)
  },
}
