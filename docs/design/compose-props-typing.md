# Design proposal: compose-aware prop typing

**Status:** implemented in `lib/compose-props` (`@praxis-kit/compose-props`), validated against
real `FactoryOptions`-shaped contracts. Not yet wired into any adapter's `ContractProps`/
`GenericsOf` — see "Next steps."

## 1. Problem statement and precedent

A downstream consumer (`praxis-components`) flagged this gap as finding #54 in its own
`PRAXIS-KIT-FINDINGS.md`. Restated here as the canonical problem statement:

When a component declares `compose: { with: Surface, allProps: true }`
(`ComposeOptions`, `lib/primitive/src/types/factory/compose-options.ts`), the runtime forwards the
composing component's entire props object to `with`. Confirmed directly in
`adapters/react/src/current/create-contract-component.ts`:

```ts
if (compose?.with !== undefined && props.asChild === undefined && !isFunction(props.render)) {
  const innerElement = render({ ...bundle, props, ref: null })
  return createElement(compose.with as ComponentType<UnknownProps>, {
    ...(compose.allProps ? props : undefined),
    asChild: true,
    ref: mergedRef ?? null,
    children: innerElement,
  })
}
```

So for `Card` composing `Surface`, `Surface`'s `radius`/`shadow`/`border`/`background` axes are
fully wired and functional through `<Card>` — but the documented pattern for a composing
component's exported props type,

```ts
export type CardProps = PolymorphicProps<ContractGenericsWithAllowedOf<typeof cardContract>>
```

only reflects `cardContract`'s own declared props. `ContractGenericsWithAllowedOf<C>`
(`lib/primitive/src/types/factory/contract-generics.ts`) projects `ContractTagOf<C>`/
`ContractPropsOf<C>`/`ContractVariantsOf<C>`/`ContractPluginOf<C>`/`ContractAllowedOf<C>` — nothing
in that derivation, or anywhere downstream of it, ever reads `C['compose']`. A type-safe consumer
cannot reach `Surface`'s forwarded props through `<Card>` without `as any` or an untyped spread.
`ComposeOptions`'s own doc comment confirms this is a known, accepted gap today ("`with` is not
currently validated at runtime or constrained... at the type level").

**This proposal is an extension of existing machinery, not a new mechanism.** An earlier framing
of this problem assumed it needed new factory-level "model metadata" — a phantom/`unique symbol`
field plus an extractor, comparable in size to the ancestry-channel proposal this repo already
scoped and rejected (`docs/design/ancestry-context.md`, PR #210, 1000+ lines across a core
primitive and seven adapter bindings). Source inspection shows that metadata mechanism **already
exists and already ships**:

- `PolymorphicComponent<G, C>` (`adapters/react/src/shared/types/polymorphic-props.ts`) carries
  `readonly __contract?: C` — the complete options object a component was built from, including
  `compose` — alongside the pre-existing `__generics?: G`.
- `HasContract<C>` (`lib/contract-props/src/has-contract.ts`) is the phantom-marker recovery type:
  `T extends HasContract<infer C> ? C : never`.
- `ContractProps<T>` (each adapter's own `polymorphic-props.ts`/`contract-props.ts`) already
  recovers `C` this way and projects `G` from it via `ContractGenericsWithAllowedOf<C>` — confirmed
  structurally identical in React, Web, and Lit; this doc's section 6 covers the others.

`compose.with` is itself a built praxis-kit component, carrying its *own* `__contract` — so
recovering its contract reuses the exact same mechanism, not a second one. The real fix is a
**targeted extension of one shared type-projection function**, proven by the spike in section 7,
not a cross-adapter rebuild.

## 2. Goals and non-goals

**Goal:** a composing component's exported props type includes `compose.with`'s forwarded surface
when `allProps: true`, computed automatically from the contract — no hand-maintained
`CardProps & SurfaceProps`-style alias per adopter.

**Non-goals:**
- No new runtime composition mechanism. The existing `compose`/`asChild`/`Slot` pipeline is
  unchanged; this is a type-extraction-time fix only.
- No attempt to type the *merged element result* — e.g. which value wins when both `Card` and
  `Surface` set the same prop at a specific call site, accounting for explicit-vs-defaulted
  values. That is a separate, harder, already-scoped-and-declined problem (see section 5).
- No new public configuration API beyond the existing `allProps` boolean. The type-side merge is
  automatic whenever `allProps: true` is set, not gated behind a second opt-in — matching the
  runtime, which also has no separate type-visibility toggle.

## 3. Proposed type architecture — intermediate types

Each step maps to one concrete responsibility, so the mechanism is auditable rather than a single
opaque type. All four types below were implemented and validated against mocked contracts in the
spike (section 7); the inline mocks differ from the real shapes only in using `MockContract`/
`MockCompose` stand-ins instead of the real `FactoryOptions`/`ComposeOptions`.

```ts
/** Recovers `T`'s own retained contract, if `T` is a praxis-kit-built component (carries
 *  `__contract` per `HasContract<C>`). `never` for an arbitrary `ComponentReference` that isn't
 *  one of ours — `compose.with` is deliberately untyped/untrusted (`ComposeOptions`'s own doc
 *  comment), so this must degrade gracefully rather than require `with` to be a praxis-kit
 *  component. */
type RecoveredContractOf<T> = T extends HasContract<infer C> ? C : never

/** `C`'s composed partner's contract, or `never` if `C` doesn't compose, composition isn't
 *  `allProps`, or `with` isn't a recognizable praxis-kit component. Isolates the three-way gate
 *  (compose present / allProps true / with recognizable) in one place instead of repeating it at
 *  every downstream read. */
type ComposedContractOf<C> = C extends { compose: { allProps: true; with: infer W } }
  ? RecoveredContractOf<W>
  : never

/** Type-level mirror of `classifyProp` (`lib/adapter-utils/src/slot/merge-slot-props.ts`) — see
 *  section 5 for why this must track the real runtime policy, not an invented taxonomy. */
type ClassifyPropKey<K extends PropertyKey> = K extends 'className' | 'class'
  ? 'concat'
  : K extends 'style'
    ? 'shallow-merge'
    : K extends `on${string}`
      ? 'chain'
      : 'child-wins'

type CollisionError<K extends PropertyKey> =
  `compose: '${K & string}' is declared by both this component and its composed partner with incompatible types`

/** Own-vs-composed key merge, resolved per `ClassifyPropKey`. `chain`/`concat`/`shallow-merge`
 *  keys are safe to coexist (the runtime combinator makes sense for two different values); a
 *  `child-wins` key present on both sides with *incompatible* types is a real authoring conflict
 *  `ComposeOptions`'s own doc comment already warns about — surfaced as a type error via
 *  `CollisionError`, not silently resolved either direction. */
type MergeComposedProps<Own, Composed> = {
  [K in keyof Own | keyof Composed]: K extends keyof Own
    ? K extends keyof Composed
      ? ClassifyPropKey<K> extends 'child-wins'
        ? Own[K] extends Composed[K]
          ? Own[K]
          : Composed[K] extends Own[K]
            ? Composed[K]
            : CollisionError<K>
        : Own[K] | Composed[K]
      : Own[K]
    : K extends keyof Composed
      ? Composed[K]
      : never
}

/** The composed props+variants `ContractProps<T>` would need — `C`'s own, with its composed
 *  partner's folded in, falling back to `C`'s own untouched shape when there's nothing to
 *  compose, so a non-composing contract's extracted type is provably unchanged (spike step 1).
 *
 *  **Recurses on `ContractGenericsWithComposeOf<CC>` for the composed partner, not on `CC`'s own
 *  raw contract.** This is not a stylistic choice — the spike's nested-composition assertion
 *  (step 5) failed the first time this was written against `CC`'s raw contract: if `Surface`
 *  itself composes a third component, projecting `Surface`'s undecorated contract silently drops
 *  that third component's props from `Card`'s own resolved type, because `Card` never sees
 *  anything beyond what `Surface` declares for itself. Recursing on the already-composed result
 *  instead makes one definition correct at every depth, bounded naturally by the real, finite
 *  chain of `compose.with` references — no artificial depth cap needed, but also not "free" in
 *  the sense an earlier framing of this proposal assumed; it has to be written this way
 *  deliberately. */
type ContractGenericsWithComposeOf<C> =
  ComposedContractOf<C> extends infer CC
    ? [CC] extends [never]
      ? { props: ContractPropsOf<C>; variants: ContractVariantsOf<C> }
      : {
          props: MergeComposedProps<ContractPropsOf<C>, ContractGenericsWithComposeOf<CC>['props']>
          variants: MergeComposedProps<
            ContractVariantsOf<C>,
            ContractGenericsWithComposeOf<CC>['variants']
          >
        }
    : never
```

**Consumer-facing change:** each adapter's `ContractProps<T>` swaps its internal
`ContractGenericsWithAllowedOf<C>` read for a `PolymorphicGenerics` built from
`ContractGenericsWithComposeOf<C>`'s `props`/`variants`, keeping `ContractTagOf<C>`/
`ContractPresetOf<C>`/`ContractAllowedOf<C>` untouched. **Deliberately not** touching
`createContractComponent`'s own return-type instantiation — `G` there stays exactly as today. The
composed surface is a type-extraction-time concern, matching how `ContractProps` already diverges
from the call signature's own non-generic fallback overload for a different, pre-existing reason
(documented in that type's own comment).

## 4. Model metadata and extraction — what's reused vs. new

| Piece | Status |
| --- | --- |
| `__contract` field | Exists, reused as-is |
| `HasContract<C>` | Exists, reused as-is |
| `ContractGenericsOf<C>` / `ContractGenericsWithAllowedOf<C>` | Exist, reused as-is, **untouched** |
| `ComposedContractOf<C>` / `ContractGenericsWithComposeOf<C>` | New (section 3) |
| `ContractProps<T>` (per adapter) | Existing type; one internal line swapped to call the new projection |

No adapter's public API surface changes. `ContractProps<typeof Card>` keeps the same name and
signature — it just resolves to a bigger type once `Card` composes.

## 5. Merge and collision semantics — grounded in the real runtime

The type-level categories in section 3 must mirror the **actual, already-shipped** merge policy,
not an invented ownership model:

- `lib/adapter-utils/src/slot/merge-slot-props.ts`:
  ```ts
  export function mergeSlotProps(slotProps: AnyRecord, childProps: AnyRecord): AnyRecord {
    const merged: AnyRecord = { ...slotProps }
    iterate.forEachKey(childProps, (key) => {
      merged[key] = applyMergePolicy(key, slotProps[key], childProps[key])
    })
    return merged
  }

  function classifyProp(key: string, slotVal: unknown, childVal: unknown): PropMergePolicy {
    if (EVENT_HANDLER_RE.test(key) && isFunction(slotVal) && isFunction(childVal)) return 'chain'
    switch (key) {
      case 'className':
      case 'class':
        return 'concat'
      case 'style':
        return 'shallow-merge'
      default:
        return 'child-wins'
    }
  }
  ```
  `iterate.forEachKey` (`@praxis-kit/foundation`, re-exported via `@praxis-kit/primitive`) is the
  actual, already-in-production key-iteration primitive this merge runs on — not a parallel
  utility this proposal needs to invent. Any future runtime tooling this proposal's type-level
  work motivates (e.g. a dev-mode collision warning) should reuse it the same way, for the same
  reason every other own-key walk in this codebase does.
- `lib/adapter-utils/src/slot/policies.ts` holds `PROP_MERGE_POLICIES`, `policyHandlers`, and the
  concrete combinators (`chainHandlers`, `mergeClassNames`, `mergeStyles`) `applyMergePolicy`
  dispatches to.
- **Confirmed call path:** `compose`'s own code in `create-contract-component.ts` does not call
  `mergeSlotProps` directly. It sets `asChild: true` on `with` and renders it; `with`'s own normal
  render path then hits `Slot.tsx` → `applySlot` → `cloneSlotChild` → `mergeProps` (the React
  adapter's `mergeProps`, `adapters/react/src/shared/slot/mergeProps.ts`, is a direct re-export of
  `mergeSlotProps`). The policy table is reached **transitively**, through `asChild`, not bypassed
  — so typing `compose` accurately means typing what `asChild` composition already does, which is
  exactly this policy table.
- `ClassifyPropKey` (section 3) approximates `classifyProp`'s `EVENT_HANDLER_RE` check with a
  `` on${string} `` key-name pattern, since types can't additionally confirm "and both sides'
  *values* are functions" the way the runtime check does. This holds for every real
  contract-authored handler prop (always typed as a function on both sides) but is a genuine,
  named simplification, not a silent assumption — if `classifyProp`'s classification rule changes,
  `ClassifyPropKey` must be updated to match, and that drift risk should be called out at review
  time for any future change to either side.
- **Not to be conflated with** `lib/primitive/src/utils/merge-props.ts`'s *different*, unrelated
  `mergeProps<T, P>(defaultProps, props)` — a nil-aware defaults-vs-props merge, applied when a
  contract's own `styling.defaults` are resolved against incoming props. This is what makes
  finding #32's "a child's own `defaults` can never win against anything the parent contributed"
  true: the defaults merge runs on the child's own render, *after* the slot merge has already
  decided what the child's incoming props are — not before. `ContractGenericsWithComposeOf` types
  the pre-defaults, explicitly-passable surface, exactly like every other prop `ContractProps<T>`
  already exposes, and does not attempt to represent which composed keys will end up shadowed by a
  default at render time. That full-merge-result problem is already scoped and explicitly declined
  as a separate, harder ask (`<Container asChild>`/`mergeSlotProps` key-presence sensitivity,
  confirmed via a type-level spike on `spike/aschild-merged-props-typelevel`) — this proposal
  deliberately stays on this side of that line.
- The `child-wins` collision rule is the type-side consequence of `ComposeOptions`'s own doc
  comment: "forwarding is only safe when `with`'s own contract is known not to have variant/prop
  names that collide with this component's own." A real collision becomes a compile error pointing
  at the offending key (`CollisionError<K>`), not a silently-wrong merged type — resolving the open
  design question raised earlier in favor of automatic folding with a compile-time guard, rather
  than a second type-side opt-in flag duplicating `allProps`.

## 6. Adapter impact assessment

- **React, Preact, Vue** (clone-based `asChild`): expected to be covered by the shared
  `lib/primitive` projection change with no further adapter-specific code, since their
  `ContractProps`/`GenericsOf` wrappers already funnel through the shared `ContractGenericsOf`/
  `ContractGenericsWithAllowedOf` family (confirmed identical shape for Web and Lit in this
  investigation). **Before rollout, confirm Preact and Vue read the same shared functions** rather
  than a parallel reimplementation — not yet verified independently.
- **Solid, Svelte** (own render-callback/snippet composition model): need a dedicated verification
  pass, not an assumed pass-through. Svelte's `adapters/svelte/src` has **no `__contract` field
  anywhere** (confirmed by search) — its `createContractComponent` return type appears to retain
  `G` as a live, inferable type parameter instead of erasing it behind a marker the way the other
  five adapters do. This section's open item: audit whether Svelte's extraction path can reach
  `C['compose']` at all today, or needs its own small addition before
  `ContractGenericsWithComposeOf` means anything there.
- **Lit, Web**: explicitly out of scope. `ComposeOptions`'s own doc comment states `compose` has
  no effect on these adapters — no `asChild` concept exists for either. Documented as a non-goal,
  not an oversight.

## 7. Validation spike

Implemented at `lib/contract-props/src/compose-generics.spike.test.ts`, following this repo's own
convention for provisional-but-real coverage (`*.spike.test.ts`, included in the normal `vitest`
suite, promoted to a plain `*.test.ts` name once confidence is established — see the
`test(adapters): promote *.spike.test.* to plain *.test.*` precedent). Self-contained and
dependency-free, matching this package's own `has-contract.test.ts` convention: `MockContract`/
`MockCompose` stand-ins rather than real `FactoryOptions`/`ComposeOptions` imports, since
`@praxis-kit/contract-props` deliberately has no dependency on `@praxis-kit/primitive`/
`@praxis-kit/core` (see section 8's open placement question). Run via
`pnpm --filter @praxis-kit/contract-props typecheck`.

Results (all passing under `tsc --noEmit`; confirmed `expectTypeOf` actually fails the build on a
deliberately wrong assertion before relying on a clean pass as real signal):

1. **Baseline, no composition** — `ContractGenericsWithComposeOf<C>` for a non-composing contract
   equals exactly `{ props: C's own props; variants: C's own variants }`. The fallback path is a
   true no-op.
2. **Simple composition** — `Card` composing `Surface` with `allProps: true` resolves to `Card`'s
   own props/variants plus `Surface`'s (`radius`, `shadow`). **2b (negative case):** a `Card` with
   no `compose` field at all leaves the partner's props unreachable — confirmed via
   `expectTypeOf<keyof Resolved['props']>().not.toEqualTypeOf<'radius'>()`.
4. **Collision** — a same-named `child-wins`-category prop (`variant`) with incompatible types on
   both sides resolves to `CollisionError<'variant'>`, not a silently-wrong type.
5. **Nested composition** — `Surface` composing `Base`, `Card` composing `Surface`: `Card`'s
   resolved type includes `Base`'s `as` prop too. This is the assertion that **failed on the first
   implementation attempt** (projecting `Surface`'s raw contract instead of recursing on
   `ContractGenericsWithComposeOf<Surface>`) and drove the correction documented in section 3 —
   recorded here so the "recursion is close to free" framing isn't repeated uncritically by whoever
   implements this for real.

**Not covered by this spike** (adapter-specific; the dependency-free `contract-props` package
can't exercise them without importing adapter types): mode extraction
(`ContractProps<T, 'asChild' | 'render'>` still resolving correctly against the new generics) and
`as`/polymorphism interaction (confirming the composed type doesn't reproduce the
`'article' & 'div'` collapse-to-`never` failure the naive intersection workaround hit in finding
#54's own addendum). Both should be validated at the real per-adapter implementation site before
merge, as explicit follow-up checks — not assumed to pass by extension of this package-level spike.

## 8. Scope, risks, open questions

- **Scope:** small enough for a focused PR — the four new types in section 3 live in one package
  (placement below), plus a one-line internal change in each applicable adapter's `ContractProps`/
  `GenericsOf` wrapper. Proportionate to the problem, unlike the ancestry-channel proposal this
  repo already declined.
- **Placement question — resolved.** Implemented as a new package, `lib/compose-props`
  (`@praxis-kit/compose-props`), depending on both `@praxis-kit/primitive` and
  `@praxis-kit/contract-props` — option (b) from the original three, keeping both existing
  packages' dependency boundaries (`contract-props` stays dependency-free) untouched.
- **Risk — Svelte:** still open, unaddressed by this implementation. `lib/compose-props` is
  framework-neutral, so wiring it into Svelte's own `GenericsOf<T>` still needs the dedicated audit
  section 6 calls for, since Svelte has no `__contract` marker to recover a composed partner's
  contract from in the first place.
- **Risk — `ClassifyPropKey` drift:** unchanged from the original proposal — flagged in section 5,
  no automated drift check implemented, code-review discipline only.
- **Risk — untrusted `with`:** closed. `lib/compose-props/src/compose-generics.test.ts`'s "risk
  check" test confirms `RecoveredContractOf` degrades cleanly (no composed props at all) when
  `compose.with` is an arbitrary non-praxis-kit callable.
- **Two additional implementation findings, not visible from the mocked spike alone** (the mocked
  spike in `lib/contract-props/src/compose-generics.spike.test.ts` didn't surface either, since its
  mock contracts never carried a real index signature):
  1. `ContractPropsOf<C>` (`DeclaredPropsFrom`) deliberately intersects a component's declared
     props with `AnyRecord` — by design, not a bug. But once both sides of a merge carry that
     index signature, `keyof Own | keyof Composed` absorbs every literal key into the bare
     `string` the index signature already implies, silently degrading `MergeComposedProps`'s
     per-key logic to iterating over `string` instead of each contract's real declared keys.
     Fixed by running both sides through `OmitIndexSignature` (`type-fest`) **before** merging,
     not after.
  2. `MergeComposedProps` can legitimately produce a `CollisionError<K>` string for a colliding
     key — not a valid `VariantStates<string>`. Since `PolymorphicGenerics`'s own
     `Variants extends Readonly<VariantMap>` constraint is checked against
     `ContractGenericsWithComposeOf`'s declaration for *every* possible `C`, not only
     collision-free ones, the merged variants result needs its own
     `extends infer M extends Readonly<VariantMap> ? M : never` guard so a real collision resolves
     to `never` (still visibly broken downstream) instead of making the type alias itself fail to
     type-check for every caller.
- **Acceptance criteria:** all spike assertions (section 7) pass under `tsc --noEmit` — confirmed,
  `pnpm --filter @praxis-kit/compose-props typecheck && test` passes 6/6, and a full workspace
  `pnpm -r typecheck` confirms no existing component's `ContractProps<T>` extraction changed.
  `praxis-components`' `CardProps` pattern can drop its hand-extension once an adapter actually
  consumes `ContractGenericsWithComposeOf` (not yet true — see "Next steps").

## Alternatives considered

1. **Status quo** — hand-maintained `CardProps & SurfaceProps`-style alias per composing
   component. Rejected: confirmed broken twice over in finding #54's own addendum — a plain
   intersection collapses `as` to `never` (both sides use the single-type-argument
   `PolymorphicProps<G>` form, narrowing `as` to each component's own default-tag literal before
   intersecting); even once that's worked around, the result still doesn't match
   `Parameters<typeof Card>[0]`, the real compiler-resolved call signature.
2. **Expose only a richer type extractor off the existing call signature** (make
   `Parameters<typeof Card>[0]` itself carry the composed surface) instead of fixing the shared
   projection. Rejected: `createContractComponent`'s own declared return type computes `G` from
   `TDefault`/`Props`/`Variants`/... the same way `ContractGenericsWithAllowedOf` does today —
   fixing extraction alone, without fixing the projection those defaults read from, just extracts
   the same incomplete type through a different door.
3. **Resolve the full model via the existing `__contract`/`HasContract` projection family** (this
   proposal) — chosen. Reuses infrastructure that already ships, isolated to a new projection
   consumed only by `ContractProps`, with no change to any adapter's actual callable signature or
   runtime behavior.

## Next steps

1. ~~Decide section 8's placement question.~~ Done — `lib/compose-props`.
2. ~~Fill the untrusted-`with` spike gap.~~ Done — covered in `compose-generics.test.ts`. Mode/`as`
   adapter-level checks (section 7) remain open; they need a real adapter, not this package.
3. Swap one real adapter's `ContractProps` (React, as the reference adapter) to call
   `ContractGenericsWithComposeOf` from `@praxis-kit/compose-props` instead of
   `ContractGenericsWithAllowedOf` directly; re-run that adapter's full existing type-test suite
   before touching the others.
4. Audit Svelte's extraction path per section 6 before claiming adapter parity.
