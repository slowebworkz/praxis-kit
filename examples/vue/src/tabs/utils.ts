import type { VNode } from 'vue'
import { isVNode } from 'vue'

export const tabId = (instanceId: string, value: string) => `${instanceId}-tab-${value}`
export const panelId = (instanceId: string, value: string) => `${instanceId}-panel-${value}`

export const isType =
  (type: unknown) =>
  (child: unknown): child is VNode =>
    isVNode(child as VNode) && (child as VNode).type === type
