import { h } from 'vue'
import type { Slots, VNode } from 'vue'
import type { NodeId } from '@pk2/pipeline'
import type { ComponentDefinition, NodeDecoration } from '@pk2/core'
import { buildRenderContext, buildTreeContext, renderComponent } from '@pk2/core'
import { vueBackend } from '@pk2/vue'

export function renderNormally(
  definition: ComponentDefinition,
  tag: string,
  decoration: Record<NodeId, NodeDecoration>,
  slots?: Slots,
): VNode {
  const treeCtx = buildTreeContext({ kind: 'native', tag, id: 'root', children: [] })
  const rendered = renderComponent(definition, treeCtx, buildRenderContext(decoration), vueBackend)
  if (slots?.default === undefined) return rendered
  // Backend produced h(tag, decorationProps) — rebuild with slot children
  const { key: _key, ...props } = (rendered.props ?? {}) as Record<string, unknown>
  return h(tag, props, { default: slots.default })
}
