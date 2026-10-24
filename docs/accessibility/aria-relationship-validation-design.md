# ARIA relationship validation: design proposal

**Status:** Proposed; design only. No runtime behavior changes are part of this document.

## Problem

The current `AriaContext` is intentionally a single-element view. It provides the intrinsic tag, implicit and effective roles, props, and variant keys, but no parent, descendants, sibling set, or document ID index. Existing widget contracts can therefore check local properties such as accessible-name and state-attribute presence, but cannot reliably validate relationships between elements.

This proposal keeps local ARIA contracts simple and introduces a separate structural validation phase only if a real caller can supply a stable element-tree representation.

## Goals

- Validate relationships only when the validator has sufficient structural/document context.
- Keep current per-element `AriaContext` and `AriaPolicyEngine` semantics stable.
- Preserve valid APG implementation alternatives rather than assuming one DOM shape or focus strategy.
- Emit diagnostics that identify the source element and the relationship that failed.
- Make relationship checks opt-in at the structural-validation boundary, not silently enabled for isolated element evaluation.

## Non-goals

- Implement keyboard interaction, focus movement, selection behavior, or widget state transitions.
- Render or mutate markup to repair relationships.
- Require `aria-activedescendant` where APG permits DOM focus on a descendant.
- Require one universal popup type or DOM arrangement for comboboxes.
- Replace the existing role/property conformance rules.

## Candidate relationship families

| Relationship | Candidate checks | Context needed | Important constraint |
| --- | --- | --- | --- |
| ID references | Resolve `aria-labelledby`, `aria-describedby`, `aria-controls`, and `aria-activedescendant` tokens to IDs in the relevant validation scope | Document/tree ID index plus element props | IDREF scope and duplicate IDs need explicit policy; do not treat every IDREF as an ownership relationship |
| Tabs | Resolve `tabpanel[aria-labelledby]` to a tab when that pattern is used; optionally check reciprocal `aria-controls` where present | Sibling/descendant traversal and ID index | Do not require reciprocal attributes unless the chosen normative rule explicitly requires them |
| Combobox | Resolve `aria-controls` when present and check that the target matches the declared popup relationship | ID index and effective roles | Valid popups may be listbox, tree, grid, or dialog; do not hard-code listbox |
| Listbox | Check option ownership/descendant structure and relevant group nesting | Ancestor/descendant traversal | Account for `group` and `aria-owns` where supported; do not equate visual nesting with semantic ownership blindly |
| Tree | Check treeitem/group hierarchy and conditional expansion metadata | Ancestor/descendant traversal | Leaf treeitems need not expose `aria-expanded`; flat and nested valid representations must remain supported |
| Grid | Check row/cell relationships and applicable row/column metadata | Ancestor/descendant traversal | Avoid requiring optional counts, indices, selection, or active-descendant universally |

This table is a candidate inventory, not an assertion that each listed check is already specified, implemented, or appropriate for the first release. Each check must be tied to a normative WAI-ARIA/APG requirement before implementation.

## Proposed architecture

1. **Keep `AriaContext` local.** Do not add optional parent, children, or document fields to every call site merely to support a small number of structural rules.
2. **Add a separate structural input model.** If implemented, accept a read-only snapshot containing stable node identity, tag, effective role, relevant DOM attributes, and parent/child links. It should not accept component variant props as if they were rendered DOM attributes.
3. **Build indexes once per validation scope.** Construct an ID index and traversal helpers before evaluating relationship rules. Define duplicate-ID handling and scope boundaries explicitly.
4. **Run structural rules as a separate phase.** Keep the existing per-element engine responsible for local rules. The structural phase should return the same diagnostic vocabulary where practical, but should not pretend it is a local `AriaRule`.
5. **Require an explicit integration point.** A caller that only has `(tag, props)` continues to receive local validation only. Structural checks run only where the adapter or caller can supply the complete relevant tree.
6. **Do not auto-fix relationships.** Diagnostics may recommend an action, but rewriting ID references or ownership changes element identity and is unsafe without caller intent.

## Diagnostic behavior

- A missing target for an ID reference is a relationship diagnostic attached to the referencing element.
- Duplicate IDs are reported separately from a missing target; resolution must not silently pick an arbitrary duplicate.
- A structurally invalid relationship should not be reported when the required context is incomplete. The validator should distinguish “not checked because context is unavailable” from “relationship is invalid.”
- Follow existing warning/error severity policy only after each rule's conformance basis is recorded. The design itself does not establish severity.

## Testing plan

- Unit-test ID indexing, duplicate IDs, tokenized IDREF attributes, and stable node identity.
- Add positive/negative tests for each relationship family, including valid APG alternatives.
- Test isolated-element evaluation to prove existing behavior is unchanged and structural rules do not run without a tree.
- Test variant/prop filtering so component-only variant inputs are not mistaken for emitted DOM attributes.
- Add adapter integration tests only for adapters that can reliably provide the relevant rendered/virtual tree.
- Use standards-backed fixtures and document any deliberate deviation.

## Decisions required before implementation

1. What is the structural validation input and who owns producing it?
2. What is the validation scope: a component subtree, a rendered document, or both?
3. How are portals, shadow roots, duplicate IDs, and cross-root ID references handled?
4. Which relationships are required by WAI-ARIA/APG, and which are optional or pattern-dependent?
5. Which adapters can supply sufficient structure, and what should happen in adapters that cannot?
6. What diagnostic severity and release policy apply to each rule?

## Recommended implementation order

1. Decide the structural input model and scope; do not change runtime APIs before this decision.
2. Implement and test ID-reference indexing as an isolated utility.
3. Add one narrowly defined relationship rule with standards-backed positive and negative fixtures.
4. Validate the rule through the first adapter that has complete structure, and verify isolated-element behavior remains unchanged.
5. Expand to tab/panel and combobox relationships, then ownership families such as listbox/tree/grid only when the first slice proves the architecture.
