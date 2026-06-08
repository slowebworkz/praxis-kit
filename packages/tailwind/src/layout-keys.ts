import type { OwnedPropKeys } from '@praxis-kit/core'

// Single source of truth for the layout display dimensions. `LayoutKey`
// (types/layout.ts) derives its type from this array, and the owned-keys set
// the adapter strips from the DOM derives its value from it — add a dimension
// here and both follow.
export const layoutKeys = ['flex', 'grid'] as const

export const LAYOUT_OWNED_KEYS: OwnedPropKeys = new Set(layoutKeys)
