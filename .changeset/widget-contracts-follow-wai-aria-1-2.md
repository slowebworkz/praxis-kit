---
'praxis-kit': minor
---

Widget-role contracts now follow the WAI-ARIA 1.2 role definitions:

- `widgetContracts.menuitem` and `.treeitem` no longer ask for `aria-label`, so content-named items
  like `<li role="menuitem">Open</li>` are no longer flagged.
- `widgetContracts.toolbar` and `.tablist` no longer require a name (1.2 doesn't). Pass
  `requireAccessibleName` in `enforcement.aria` to keep requiring one.
- A missing `aria-selected` on `role="option"` is reported once instead of twice.
- `role="combobox"` now also requires `aria-controls`, as WAI-ARIA 1.2 does, alongside
  `aria-expanded`.
- The `role="tab"` message now says `aria-selected` is APG guidance rather than a 1.2 requirement.
- New contracts: `widgetContracts.alertdialog`, `.treegrid` (accessible name) and `.switch`
  (`aria-checked`).
