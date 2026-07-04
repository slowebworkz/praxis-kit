import { h } from 'vue'
import type { Slots, VNode } from 'vue'
import type { AnyRecord } from '@praxis-kit/primitive'
import type { NodeId } from '@praxis-kit/pipeline'
import type { ComponentDefinition, NodeDecoration } from '@praxis-kit/runtime'
import { buildRenderContext, buildTreeContext, renderComponent } from '@praxis-kit/runtime'
import { vueBackend } from '../backend/vue-backend'

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
  const { key: _key, ...props } = (rendered.props ?? {}) as AnyRecord
  return h(tag, props, { default: slots.default })
}
