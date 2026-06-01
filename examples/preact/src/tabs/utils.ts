import { isValidElement } from 'preact/compat'
import type { VNode } from 'preact'

export const tabId = (instanceId: string, value: string) => `${instanceId}-tab-${value}`
export const panelId = (instanceId: string, value: string) => `${instanceId}-panel-${value}`

export const isType =
  (type: unknown) =>
  (child: unknown): child is VNode =>
    isValidElement(child) && (child as VNode).type === type
