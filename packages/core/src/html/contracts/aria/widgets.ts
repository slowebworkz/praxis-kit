import { AriaDiagnostics } from '@praxis-kit/contract'
import type { AriaContext, AriaResult } from '../../../types'
import { requireAccessibleName } from '../../aria-rules'
import { ariaContract } from '../helpers'

// Audit basis: WAI-ARIA 1.2 role definitions (https://www.w3.org/TR/wai-aria-1.2/) plus the APG
// patterns. Two facts drive which contracts check anything here:
//
// - A role whose accessible name may come from *content* (`menuitem`, `treeitem`, `option`,
//   `radio`, `checkbox`, `switch`, …) is satisfied by its text. An element-local contract can't see
//   children, so checking for `aria-label` would reject valid `<li role="menuitem">Open</li>`.
//   Those contracts therefore carry no name rule.
// - A role whose name is "name required" and author-only (`dialog`, `alertdialog`, `grid`,
//   `treegrid`, `listbox`, `tree`, `combobox`, `tabpanel`, `radiogroup`) must be named by
//   `aria-label`/`aria-labelledby`, so those contracts check for one.
//
// Roles the spec does not mark "name required" (`toolbar`, `tablist`, `menu`, `menubar`) are
// documented in their own comments.

/**
 * `<dialog>` — must have an accessible name (aria-label or aria-labelledby).
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 * Without a name, assistive technology cannot identify the dialog in the page outline
 * or when focus moves into it.
 */
export const dialogContract = ariaContract([requireAccessibleName])

// ─── Widget role contracts ────────────────────────────────────────────────────

/**
 * `role="alertdialog"` — a modal dialog that interrupts the workflow with an urgent message.
 * Name from author only, and WAI-ARIA 1.2 marks the name required.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/
 */
export const alertdialogContract = ariaContract([requireAccessibleName])

/**
 * `role="menu"` — keyboard-navigable pop-up list of actions or functions.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/menu/
 */
export const menuContract = ariaContract([requireAccessibleName])

/**
 * `role="menuitem"` — an actionable item within a menu or menubar.
 *
 * Carries no rule. WAI-ARIA 1.2 requires an accessible name, but it may come from the item's
 * content, which this single-element contract cannot see; checking `aria-label` would reject
 * `<li role="menuitem">Open</li>`. Menu ownership is covered by `validateAriaMenuRelationships`.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
 */
export const menuitemContract = ariaContract([])

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
 * `role="treeitem"` — an item in a hierarchical tree.
 *
 * Carries no rule. WAI-ARIA 1.2 requires an accessible name, but it may come from the item's
 * content, which this single-element contract cannot see. `treeitem` has no required states in
 * 1.2 (`aria-selected`/`aria-checked` are inherited, `aria-expanded` is supported and only
 * meaningful for parent items), so there is no state to require either. Tree and group ancestry is
 * covered by `validateAriaTreeRelationships`.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 */
export const treeitemContract = ariaContract([])

/**
 * `role="grid"` — composite widget containing rows of cells, similar to a spreadsheet.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/grid/
 */
export const gridContract = ariaContract([requireAccessibleName])

/**
 * `role="treegrid"` — a grid whose rows can be expanded and collapsed. Name from author only,
 * and WAI-ARIA 1.2 marks the name required.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/
 */
export const treegridContract = ariaContract([requireAccessibleName])

/**
 * `role="combobox"` — input or button that controls a popup for choosing a value.
 * This contract checks the accessible name only. `aria-expanded` and `aria-controls`, both required
 * by WAI-ARIA 1.2, are handled by the shared ARIA required-property validation; resolving the
 * `aria-controls` target and popup ownership need cross-element context
 * (`validateAriaComboboxRelationships`).
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 */
export const comboboxContract = ariaContract([requireAccessibleName])

/**
 * `role="listbox"` — list from which a user may select one or more options.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
 */
export const listboxContract = ariaContract([requireAccessibleName])

/**
 * `role="toolbar"` — a grouping of controls that functions as a single widget.
 *
 * Carries no rule. WAI-ARIA 1.2 does not require a name for `toolbar`; the APG asks for a label
 * only when a page has more than one toolbar, which a single-element contract cannot know (the same
 * reasoning that makes `landmarkAccessibleNameRule` opt-in). Pass `requireAccessibleName` in
 * `enforcement.aria` to require one. Keyboard navigation and focus management are behavioral
 * concerns.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
 */
export const toolbarContract = ariaContract([])

/**
 * `role="tablist"` — container for a set of tabs that manage tab panels.
 *
 * Carries no rule. WAI-ARIA 1.2 does not require a name for `tablist` (name from author only);
 * labelling it is a recommendation that depends on the page. Pass `requireAccessibleName` in
 * `enforcement.aria` to require one. Tab/panel references are covered by
 * `validateAriaTabRelationships`.
 * APG: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
export const tablistContract = ariaContract([])

/**
 * `role="radiogroup"` — group of radio buttons where only one may be selected at a time.
 * WAI-ARIA 1.2: https://www.w3.org/TR/wai-aria-1.2/#radiogroup
 */
export const radiogroupContract = ariaContract([requireAccessibleName])

/**
 * Creates a local widget-role rule for a state that the role must expose.
 *
 * `source` records where the requirement comes from, so the message doesn't present an APG
 * practice as a WAI-ARIA conformance error: `'aria'` for a state WAI-ARIA 1.2 lists under the role's
 * required states and properties, `'apg'` for one the role merely supports and the APG pattern asks
 * authors to set.
 *
 * This intentionally checks attribute presence, not truthiness: values such as
 * `aria-selected="false"` and `aria-checked="false"` are valid. The contract is applied explicitly
 * for a role, so it does not infer widget identity from a host element or attempt cross-element APG
 * relationship checks.
 */
function requireAriaState(attribute: string, role: string, source: 'aria' | 'apg' = 'aria') {
  return ({ tag, props }: AriaContext): readonly AriaResult[] => {
    if (attribute in props) return []

    const message =
      source === 'aria'
        ? `role="${role}" requires ${attribute}. Set it to the current state, including "false" when appropriate.`
        : `role="${role}" should set ${attribute} (APG ${role} pattern). WAI-ARIA 1.2 lists it as supported, not required. Set it to the current state, including "false" when appropriate.`
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

/**
 * `role="tab"` — expose whether this tab is currently selected. WAI-ARIA 1.2 lists `aria-selected`
 * as supported; the APG tabs pattern asks for it on every tab (`true` on the active one).
 */
export const tabContract = ariaContract([requireAriaState('aria-selected', 'tab', 'apg')])

/** `role="radio"` — expose the checked state, including an explicit false. */
export const radioContract = ariaContract([requireAriaState('aria-checked', 'radio')])

/** `role="checkbox"` — expose the checked state, including an explicit false. */
export const checkboxContract = ariaContract([requireAriaState('aria-checked', 'checkbox')])

/** `role="switch"` — expose the on/off state, including an explicit false. */
export const switchContract = ariaContract([requireAriaState('aria-checked', 'switch')])

/**
 * `role="tabpanel"` — provide an accessible name, commonly via
 * `aria-labelledby` pointing to its controlling tab. The static contract does
 * not resolve that ID reference or validate sibling relationships.
 */
export const tabpanelContract = ariaContract([requireAccessibleName])

/**
 * `role="option"` — carries no rule here. `aria-selected` is required by WAI-ARIA 1.2 and is
 * already checked by the shared ARIA required-property validation for any explicit `role="option"`;
 * repeating the check here reported the same omission twice. The accessible name may come from
 * content.
 */
export const optionContract = ariaContract([])

/** `role="menuitemcheckbox"` — expose its checked state, including false. */
export const menuitemcheckboxContract = ariaContract([
  requireAriaState('aria-checked', 'menuitemcheckbox'),
])

/** `role="menuitemradio"` — expose its checked state, including false. */
export const menuitemradioContract = ariaContract([
  requireAriaState('aria-checked', 'menuitemradio'),
])
