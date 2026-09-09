import { requireAccessibleName } from '../../aria-rules'
import { ariaContract } from '../helpers'

/**
 * `<dialog>` — must have an accessible name (aria-label or aria-labelledby).
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 * Without a name, assistive technology cannot identify the dialog in the page outline
 * or when focus moves into it.
 */
export const dialogContract = ariaContract([requireAccessibleName])

// ─── Widget role contracts ────────────────────────────────────────────────────

/**
 * `role="menu"` — keyboard-navigable pop-up list of actions or functions.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/menu/
 */
export const menuContract = ariaContract([requireAccessibleName])

/**
 * `role="menubar"` — persistent horizontal menu bar of menu items.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
 */
export const menubarContract = ariaContract([requireAccessibleName])

/**
 * `role="tree"` — hierarchical list where items can be expanded or collapsed.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 */
export const treeContract = ariaContract([requireAccessibleName])

/**
 * `role="grid"` — composite widget containing rows of cells, similar to a spreadsheet.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
 */
export const gridContract = ariaContract([requireAccessibleName])

/**
 * `role="listbox"` — list from which a user may select one or more options.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
 */
export const listboxContract = ariaContract([requireAccessibleName])

/**
 * `role="tablist"` — container for a set of tabs that manage tab panels.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
export const tablistContract = ariaContract([requireAccessibleName])

/**
 * `role="radiogroup"` — group of radio buttons where only one may be selected at a time.
 * WAI-ARIA 1.2: https://www.w3.org/TR/wai-aria-1.2/#radiogroup
 */
export const radiogroupContract = ariaContract([requireAccessibleName])
