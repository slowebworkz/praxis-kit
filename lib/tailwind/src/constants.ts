import type { OwnedPropKeys } from '@praxis-kit/core'

import { layoutKeys } from './layout-keys'
import type { LayoutKey } from './types/layout'

export const LAYOUT_OWNED_KEYS: OwnedPropKeys = new Set(layoutKeys)

// Maps each prop name to its filtering family.
// flex/inline-flex → 'flex', grid/inline-grid → 'grid', all others → 'none'.
export const LAYOUT_FAMILY_MAP = {
  flex: 'flex',
  'inline-flex': 'flex',
  grid: 'grid',
  'inline-grid': 'grid',
  block: 'none',
  'inline-block': 'none',
  inline: 'none',
  hidden: 'none',
  contents: 'none',
  'flow-root': 'none',
  'list-item': 'none',
  table: 'none',
  'inline-table': 'none',
  'table-caption': 'none',
  'table-cell': 'none',
  'table-column': 'none',
  'table-column-group': 'none',
  'table-footer-group': 'none',
  'table-header-group': 'none',
  'table-row-group': 'none',
  'table-row': 'none',
} as const satisfies Record<LayoutKey<typeof layoutKeys>, 'flex' | 'grid' | 'none'>

export const EMPTY_SET: ReadonlySet<string> = new Set<string>()

export const COMPOUND_META_KEYS: ReadonlySet<string> = new Set(['class'])
