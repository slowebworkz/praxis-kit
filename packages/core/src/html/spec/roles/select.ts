import type { AriaRole } from '../../../types'

// `<select>`'s allowed explicit `role` depends on its form:
//  - default drop-down (implicit `combobox`): `menu` is the one documented alternate.
//  - list box (`multiple`, or `size` > 1 → implicit `listbox`): no explicit `role` is permitted.
// Cross-checked against the "ARIA in HTML" WD `<select>` rows (2026-09, see
// docs/accessibility/html-aria-audit.md). The list-box case is handled by `selectElementSpec`'s
// dynamic resolver returning `[]`; this constant is only the drop-down row.
export const ALLOWED_SELECT_ROLES: readonly AriaRole[] = ['menu']
