// Single source of truth for all reserved display prop names. `LayoutKey`
// (types/layout.ts) derives its type from this array. To add a new display
// value: add the entry here and its family in constants.ts LAYOUT_FAMILY_MAP.
// Prop names match CSS class names exactly — no separate display-class map is needed.
export const layoutKeys = [
  'flex',
  'inline-flex',
  'grid',
  'inline-grid',
  'block',
  'inline-block',
  'inline',
  'hidden',
  'contents',
  'flow-root',
  'list-item',
  'table',
  'table-caption',
  'table-cell',
  'table-column',
  'table-column-group',
  'table-footer-group',
  'table-header-group',
  'table-row-group',
  'table-row',
] as const
