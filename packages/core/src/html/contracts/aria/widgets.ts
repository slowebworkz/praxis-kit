import { AriaDiagnostics } from '@praxis-kit/contract'
import type { AriaContext, AriaResult } from '../../../types'
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

/**
 * Creates a local widget-role rule for a state that WAI-ARIA requires on the
 * role itself. This intentionally checks attribute presence, not truthiness:
 * values such as `aria-selected="false"` and `aria-checked="false"` are valid.
 *
 * The contract is applied explicitly for a role, so it does not infer widget
 * identity from a host element or attempt cross-element APG relationship checks.
 */
function requireAriaState(attribute: string, role: string) {
  return ({ tag, props }: AriaContext): readonly AriaResult[] => {
    if (attribute in props) return []

    const message = `role="${role}" requires ${attribute}. Set it to the current state, including "false" when appropriate.`
    return [
      {
        valid: false,
        fixable: false,
        severity: 'warning',
        diagnostic: AriaDiagnostics.fromViolation({
          message,
          tag,
          role,
          attribute,
          severity: 'warning',
          phase: 'evaluate',
        }),
      },
    ]
  }
}

/** `role="tab"` — expose whether this tab is currently selected. */
export const tabContract = ariaContract([requireAriaState('aria-selected', 'tab')])

/** `role="radio"` — expose the checked state, including an explicit false. */
export const radioContract = ariaContract([requireAriaState('aria-checked', 'radio')])

/** `role="checkbox"` — expose the checked state, including an explicit false. */
export const checkboxContract = ariaContract([requireAriaState('aria-checked', 'checkbox')])

/**
 * `role="tabpanel"` — provide an accessible name, commonly via
 * `aria-labelledby` pointing to its controlling tab. The static contract does
 * not resolve that ID reference or validate sibling relationships.
 */
export const tabpanelContract = ariaContract([requireAccessibleName])

/**
 * `role="option"` — expose the option's selection state. Presence is checked
 * rather than truthiness, so `aria-selected="false"` remains valid.
 */
export const optionContract = ariaContract([requireAriaState('aria-selected', 'option')])
