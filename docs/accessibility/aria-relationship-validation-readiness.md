# ARIA relationship validation: implementation readiness

Status: **readiness analysis only**. This document does not approve a runtime API or change
validation behavior.

## Current architecture observed in this snapshot

- `AriaContext` in `lib/primitive/src/types/aria-rule/aria-context.ts` carries one intrinsic tag,
  implicit/effective role, props, and component variant keys. It has no node identity, parent/child
  links, document scope, or ID index.
- `AriaPolicyEngine` in `lib/contract/src/aria/aria-policy-engine.ts` derives that local context,
  selects and runs local rules, applies fixes, and returns a `ValidationResult` for the evaluated
  element. Its static `evaluate(tag, props)` entry point cannot resolve references to other nodes.
- The contract package exports the ARIA policy engine and rules through `lib/contract/src/aria/index.ts`
  and `lib/contract/src/index.ts`.
- The repository has separate structural child evaluation (`lib/contract/src/children`). That is
  evidence that structure-aware checks have a distinct home, but its current child contract API
  should not be assumed to provide rendered DOM IDs or effective ARIA roles without inspection.
- Component variant keys matter: only attributes that will reach rendered markup should be treated
  as DOM relationship attributes. A future structural input must represent rendered attributes, not
  arbitrary component props.

## Recommended first implementation slice

Start with a pure, framework-neutral ID-reference index utility. Do not integrate it into
`AriaPolicyEngine` yet.

The utility should accept an explicit, immutable list of snapshot nodes with stable per-snapshot
identity, optional `id`, and the relevant rendered attributes. It should return lookup results that
distinguish:

- no matching target;
- exactly one target;
- duplicate IDs (ambiguous target).

Build the index once per supplied validation scope. Do not silently select one target for a duplicate
ID. Keep this utility independent of browser globals and DOM objects so it can be unit-tested in
Node and used by adapters that can supply a snapshot.

This first slice should index IDs only. It must not yet assert that a target is a valid target for
`aria-controls`, `aria-labelledby`, or `aria-activedescendant`; those checks need separate,
attribute-specific normative rules and role semantics.

## Proposed conceptual input

```ts
type AriaRelationshipNode = {
  readonly nodeId: string
  readonly id?: string
  readonly attributes: Readonly<Record<string, string | undefined>>
}
```

This is a design sketch, not a committed public type. Before implementation, decide whether the
snapshot needs tag/effective-role fields and whether duplicate `nodeId` values are rejected. The
snapshot should contain rendered DOM attributes only, with ID and IDREF values represented as
strings.

## Test matrix for the index utility

| Case | Expected result |
| --- | --- |
| Empty node list | Empty index; lookups are missing |
| Node without `id` | Node is not indexed |
| One node with a given ID | Lookup returns one unambiguous target |
| Multiple nodes with the same ID | Lookup reports ambiguity and preserves all matching node identities |
| IDs differing only by case | Treated as distinct IDs; matching follows exact ID string semantics |
| Mutation of caller-owned input after index creation | Index result remains stable, or the API explicitly documents and tests a different ownership model |
| Multiple independent scopes | Each index resolves only within the supplied scope |

## Not in the first slice

- No changes to `AriaContext` or `AriaPolicyEngine`.
- No diagnostics or automatic fixes.
- No token parsing for `aria-labelledby` / `aria-describedby`.
- No structural rules for tabs, comboboxes, listboxes, trees, or grids.
- No claim that every IDREF attribute has the same target-role constraints.
- No implicit cross-portal or cross-shadow-root resolution.

## Acceptance criteria

1. Index construction and lookup are pure and deterministic.
2. Duplicate IDs are explicit and never resolved arbitrarily.
3. The utility has focused unit tests for the matrix above.
4. Existing per-element validation behavior remains unchanged.
5. The utility is not exported as a stable public API until scope, node identity, and integration ownership are decided.
6. Each later relationship rule cites its normative basis and has valid-pattern fixtures before it is enabled.

## Decisions still required before integration

- Which caller can supply a complete rendered snapshot, and at what lifecycle point?
- Is the scope a component subtree, document, or adapter-defined tree?
- How should portals and shadow roots affect reference resolution?
- Which diagnostic vocabulary/severity should structural findings use?
- Which adapters can provide reliable structure, and what is the documented behavior elsewhere?
