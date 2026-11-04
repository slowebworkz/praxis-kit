# APG widget-contract coverage review (F7)

**Status:** Review complete; F7 closed for the current explicit-role `widgetContracts` registry.
Amended 2026-11 — see "Amendment" below: a later pass against the WAI-ARIA 1.2 role definitions
corrected several contracts this review had accepted. This is a scoped review of those static
widget-role contracts and supplied-scope relationship validators, not a review of every native HTML
element contract or a claim of exhaustive implementation of every WAI-ARIA APG pattern. The native
`<dialog>` `dialogContract` is registered through `htmlContracts`, not `widgetContracts`, and is
intentionally outside this widget-role coverage matrix.

## Review basis

Reviewed the contract registry and its tests in:

- `packages/core/src/html/contracts/aria/widgets.ts`
- `packages/core/src/html/contracts/maps.ts` (to distinguish `htmlContracts` from `widgetContracts`)
- `packages/core/src/html/contracts/aria/widgets.test.ts`
- `packages/core/src/html/contracts.test.ts`
- `packages/core/src/html/aria-relationships/validate-tab-relationships.test.ts`
- `packages/core/src/html/aria-relationships/validate-combobox-relationships.test.ts`
- `packages/core/src/html/aria-relationships/validate-tree-relationships.test.ts`
- `packages/core/src/html/aria-relationships/validate-grid-relationships.test.ts`
- `packages/core/src/html/aria-relationships/validate-radiogroup-relationships.test.ts`
- `packages/core/src/html/aria-relationships/validate-menu-relationships.test.ts`
- `docs/accessibility/html-aria-audit.md`

The tests characterize registry membership, required-state presence (including explicit `false`),
accessible-name checks, and the documented relationship-validator boundaries.

## Findings

1. **No additional conditional state rule is justified at the single-element layer by this review.**
   Menu-item `aria-haspopup` / `aria-expanded` and `aria-disabled` are conditional or optional;
   treeitem `aria-expanded` is not universal because leaf items exist; listbox and tree selection
   approaches and focus-management alternatives vary. Requiring these universally would reject valid
   patterns.
2. **Structural relationships are covered only where callers provide a scope.** Existing validators
   cover tabs/panels and declared ID references, combobox popup references, listbox option ownership
   and active-descendant ownership, treeitem/group ownership and selection-mechanism consistency,
   grid row/rowgroup/cell ownership and active descendants, radiogroup/radio membership, and
   menu/menubar item ownership. They intentionally do not infer unseen DOM structure or
   document-wide context.
3. **Keyboard interaction, focus movement, mutual exclusion, and state transitions are not static
   contract requirements.** They belong to runtime behavior if Praxis Kit supplies such a runtime.
4. **Documentation gap found and corrected:** `checkbox`'s existing required `aria-checked` state
   contract and tests were omitted from the APG coverage matrix. The matrix now records this
   coverage.
5. **Scope limitation:** the current registry is not an exhaustive implementation of every APG
   pattern. This review does not add contracts for currently unregistered patterns or imply they are
   supported. Additional widget families should be proposed as discrete work with their own
   applicability and context analysis, rather than keeping F7 open indefinitely as an unspecified
   umbrella item.

## Decision

Close F7 for the explicit-role `widgetContracts` registry after reconciling the audit matrix and
decision record. Native HTML element contracts, including the separately registered `<dialog>`
`dialogContract`, are outside this matrix and are not claimed as part of this F7 review. No runtime
behavior, new ARIA rule, relationship validator, or ancestry support is added by this patch. F8
remains deferred past 0.1: header/footer ancestry requires a separate architecture decision because
the current `AriaContext` is a single-element view.

## Verification boundary

This is a source-and-test review; it does not claim that the test suite was executed as part of this
patch. The change is documentation-only.

## Amendment (2026-11) — re-check against WAI-ARIA 1.2

This review was source-and-test only: it checked that the contracts matched their tests and the
audit matrix, not that they matched the role definitions. A follow-up compared each contract with
the WAI-ARIA 1.2 role definitions and ran them through the policy engine. It reopened parts of
findings 1 and 5:

- **Naming was over-applied.** `menuitem` and `treeitem` were treated as needing `aria-label`, but
  their name may come from content, which a single-element contract cannot see. `toolbar` and
  `tablist` are not name-required in 1.2. These checks were removed (naming stays available as the
  exported `requireAccessibleName` rule).
- **`option` was checked twice**, producing two diagnostics for one omission; the engine's check is
  now the only one.
- **`combobox`** now also requires `aria-controls`, as 1.2 does.
- **`tab`**'s `aria-selected` is APG guidance, not a 1.2 requirement, and the message now says so.
- **Scope (finding 5) was extended narrowly**: `alertdialog`, `treegrid` and `switch` were added
  because their requirements are unambiguous and element-local. `slider`, `meter` and a role-form
  `dialog` remain unregistered.

Details and rationale are in the F7 amendment in
[`html-aria-audit.md`](./html-aria-audit.md#f7-amendment--role-definitions-re-checked-against-wai-aria-12-2026-11).
