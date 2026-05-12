import type { LayoutKey } from './types/layout'

export type DependencyRules = Record<LayoutKey, readonly RegExp[]>

export const defaultDependencyRules: DependencyRules = {
  flex: [/^flex-/, /^grow/, /^shrink/, /^basis-/],
  grid: [/^grid-/, /^col-/, /^row-/, /^auto-cols-/, /^auto-rows-/],
} as const
