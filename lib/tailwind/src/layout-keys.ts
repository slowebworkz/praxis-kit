/**
 * Canonical list of reserved layout prop names.
 *
 * This array is the single source of truth for every supported CSS `display`
 * value exposed as a boolean prop. The `LayoutKey` type is derived directly
 * from this list.
 *
 * To add a new display mode:
 *   1. Add the display value here.
 *   2. Register its layout family in `LAYOUT_FAMILY_MAP`.
 *
 * Prop names intentionally match the corresponding Tailwind/CSS display
 * utilities, so no additional prop-to-class mapping is required.
 */
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
  'inline-table',
  'table-caption',
  'table-cell',
  'table-column',
  'table-column-group',
  'table-footer-group',
  'table-header-group',
  'table-row-group',
  'table-row',
] as const
