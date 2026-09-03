import type { HtmlContractMap } from '@praxis-kit/contract'
import type { ContractGroup } from './types'
import { buildMap } from './build-map'
import {
  dialogContract,
  gridContract,
  landmarkContract,
  listboxContract,
  menuContract,
  menubarContract,
  radiogroupContract,
  tablistContract,
  treeContract,
} from './aria'
import { LANDMARK_TAGS, TEXT_ONLY_TAGS, VOID_TAGS } from './categories'
import {
  anchorContract,
  buttonContract,
  colgroupContract,
  datalistContract,
  detailsContract,
  dlContract,
  fieldsetContract,
  figureContract,
  headContract,
  htmlContract,
  labelContract,
  listContract,
  mediaContract,
  objectContract,
  optgroupContract,
  pContract,
  pictureContract,
  selectContract,
  tableBodyContract,
  tableContract,
  tableRowContract,
  textOnlyContract,
  voidContract,
} from './html'

/**
 * Groups of HTML elements that share the same enforcement contract.
 *
 * Expanded into `htmlContracts` below to avoid repeating identical mappings.
 */
const CONTRACT_GROUPS: readonly ContractGroup[] = [
  [VOID_TAGS, voidContract],
  [TEXT_ONLY_TAGS, textOnlyContract],
  [LANDMARK_TAGS, landmarkContract],
  [['ul', 'ol', 'menu'], listContract],
  [['audio', 'video'], mediaContract],
  [['thead', 'tbody', 'tfoot'], tableBodyContract],
]

/**
 * Built-in HTML element contracts keyed by tag name.
 *
 * Pass a contract directly to `createContractComponent`:
 *
 * ```ts
 * const List = createContractComponent({
 *   tag: 'ul',
 *   enforcement: htmlContracts.ul,
 * })
 * ```
 *
 * Contracts default to `strict: 'warn'`. Override individual options by
 * spreading the contract into a new enforcement object.
 */
export const htmlContracts: HtmlContractMap = {
  ...buildMap(CONTRACT_GROUPS),

  table: tableContract,
  tr: tableRowContract,
  colgroup: colgroupContract,

  dl: dlContract,

  select: selectContract,
  optgroup: optgroupContract,
  datalist: datalistContract,

  picture: pictureContract,

  figure: figureContract,
  details: detailsContract,
  fieldset: fieldsetContract,
  dialog: dialogContract,
  object: objectContract,

  button: buttonContract,
  a: anchorContract,
  label: labelContract,
  p: pContract,

  head: headContract,
  html: htmlContract,
}

/**
 * Built-in contracts for WAI-ARIA composite widget roles.
 *
 * Use these when semantics are provided by an explicit `role` attribute rather
 * than the HTML element itself.
 *
 * ```ts
 * const Menu = createContractComponent({
 *   tag: 'ul',
 *   enforcement: widgetContracts.menu,
 * })
 *
 * // Consumer renders:
 * // <ul role="menu" aria-label="File">
 * ```
 *
 * Widget contracts enforce the accessibility requirements defined by the
 * WAI-ARIA Authoring Practices, such as requiring an accessible name for
 * composite widgets.
 */
export const widgetContracts: HtmlContractMap = {
  menu: menuContract,
  menubar: menubarContract,
  tree: treeContract,
  grid: gridContract,
  listbox: listboxContract,
  tablist: tablistContract,
  radiogroup: radiogroupContract,
}
