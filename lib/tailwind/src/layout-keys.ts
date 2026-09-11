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

/**
 * The concrete union of layout prop names — the pre-resolved form of
 * `LayoutKey<typeof layoutKeys>`, colocated with the tuple it derives from.
 *
 * For code that needs to *name* the layout keys in a type without also importing the runtime
 * tuple. A framework adapter uses it to collapse the mutually-exclusive `LayoutProps` union back
 * out of an *extracted* prop type (`ContractProps<typeof Component>`): there a caller wants "the
 * layout props exist and are optional `true`s", not the ~22-member discriminated union that the
 * component's own call signature carries — where "only one may be `true`" is a useful error.
 */
export type LayoutKeyName = (typeof layoutKeys)[number]
