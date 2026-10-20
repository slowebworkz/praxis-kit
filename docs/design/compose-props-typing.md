# Design proposal: compose-aware prop typing

**Status:** implemented in `lib/compose-props` (`@praxis-kit/compose-props`) and wired into React,
Preact, Vue, and Solid's `ContractProps`. Svelte is confirmed blocked without a runtime-shape change
(not merely unverified); Lit/Web are out of scope by design — see "Next steps" and section 6.

## 1. Problem statement and precedent

A downstream consumer (`praxis-components`) flagged this gap as finding #54 in its own
`PRAXIS-KIT-FINDINGS.md`. Restated here as the canonical problem statement:

When a component declares `compose: { with: Surface, allProps: true }` (`ComposeOptions`,
`lib/primitive/src/types/factory/compose-options.ts`), the runtime forwards the composing
component's entire props object to `with`. Confirmed directly in
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
fully wired and functional through `<Card>` — but the documented pattern for a composing component's
exported props type,

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

**This proposal is an extension of existing machinery, not a new mechanism.** An earlier framing of
this problem assumed it needed new factory-level "model metadata" — a phantom/`unique symbol` field
plus an extractor, comparable in size to the ancestry-channel proposal this repo already scoped and
rejected (`docs/design/ancestry-context.md`, PR #210, 1000+ lines across a core primitive and seven
adapter bindings). Source inspection shows that metadata mechanism **already exists and already
ships**:

- `PolymorphicComponent<G, C>` (`adapters/react/src/shared/types/polymorphic-props.ts`) carries
  `readonly __contract?: C` — the complete options object a component was built from, including
  `compose` — alongside the pre-existing `__generics?: G`.
- `HasContract<C>` (`lib/contract-props/src/has-contract.ts`) is the phantom-marker recovery type:
  `T extends HasContract<infer C> ? C : never`.
- `ContractProps<T>` (each adapter's own `polymorphic-props.ts`/`contract-props.ts`) already
  recovers `C` this way and projects `G` from it via `ContractGenericsWithAllowedOf<C>` — confirmed
  structurally identical in React, Web, and Lit; this doc's section 6 covers the others.

`compose.with` is itself a built praxis-kit component, carrying its _own_ `__contract` — so
recovering its contract reuses the exact same mechanism, not a second one. The real fix is a
**targeted extension of one shared type-projection function**, proven by the spike in section 7, not
a cross-adapter rebuild.

## 2. Goals and non-goals

**Goal:** a composing component's exported props type includes `compose.with`'s ordinary forwarded
props when `allProps: true`, and includes the partner's styling variants whenever `compose.with` is
present. Variant visibility is independent of raw prop forwarding, matching the composition styling
pipeline contract in `.vscode/COMPOSE.md`.

**Non-goals:**

- This document focuses on public type extraction. Runtime composition and styling semantics are
  specified in `.vscode/COMPOSE.md` and implemented at the adapter runtime boundary.
- No attempt to type the _merged element result_ — e.g. which value wins when both `Card` and
  `Surface` set the same prop at a specific call site, accounting for explicit-vs-defaulted values.
  That is a separate, harder, already-scoped-and-declined problem (see section 5).
- No new public configuration API beyond the existing `allProps` boolean. `allProps` controls
  ordinary raw prop forwarding; it does not gate the composed styling-variant surface.

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
type ComposedContractOf<C> = C extends { compose: { with: infer W } }
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
 *  deliberately. This recursion applies to ordinary props exposed by the partner. Styling variants
 *  and presets are merged from the direct partner contract only, matching `.vscode/COMPOSE.md`'s
 *  rule not to flatten nested composition styling metadata. */
type ContractGenericsWithComposeOf<C> =
  ComposedContractOf<C> extends infer CC
    ? [CC] extends [never]
      ? {
          props: ContractPropsOf<C>
          variants: ContractVariantsOf<C>
          preset: ContractPresetOf<C>
        }
      : {
          props: C extends { compose: { allProps: true } }
            ? MergeComposedProps<ContractPropsOf<C>, ContractGenericsWithComposeOf<CC>['props']>
            : ContractPropsOf<C>
          variants: MergeComposedProps<ContractVariantsOf<C>, ContractVariantsOf<CC>>
          preset: MergePresetMaps<ContractPresetOf<CC>, ContractPresetOf<C>>
        }
    : never
```

**Consumer-facing change:** each adapter's `ContractProps<T>` swaps its internal
`ContractGenericsWithAllowedOf<C>` read for a `PolymorphicGenerics` built from
`ContractGenericsWithComposeOf<C>`'s `props`/`variants`/`preset`, keeping `ContractTagOf<C>` and
`ContractAllowedOf<C>` untouched. **Deliberately not** touching `createContractComponent`'s own
return-type instantiation — `G` there stays exactly as today. The composed surface is a
type-extraction-time concern, matching how `ContractProps` already diverges from the call
signature's own non-generic fallback overload for a different, pre-existing reason (documented in
that type's own comment).

## 4. Model metadata and extraction — what's reused vs. new

| Piece                                                        | Status                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| `__contract` field                                           | Exists, reused as-is                                                |
| `HasContract<C>`                                             | Exists, reused as-is                                                |
| `ContractGenericsOf<C>` / `ContractGenericsWithAllowedOf<C>` | Exist, reused as-is, **untouched**                                  |
| `ComposedContractOf<C>` / `ContractGenericsWithComposeOf<C>` | New (section 3)                                                     |
| `ContractProps<T>` (per adapter)                             | Existing type; one internal line swapped to call the new projection |

No adapter's public API surface changes. `ContractProps<typeof Card>` keeps the same name and
signature — it just resolves to a bigger type once `Card` composes.

## 5. Merge and collision semantics — grounded in the real runtime

The type-level categories in section 3 must mirror the **actual, already-shipped** merge policy, not
an invented ownership model:

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
  actual, already-in-production key-iteration primitive this merge runs on — not a parallel utility
  this proposal needs to invent. Any future runtime tooling this proposal's type-level work
  motivates (e.g. a dev-mode collision warning) should reuse it the same way, for the same reason
  every other own-key walk in this codebase does.
- `lib/adapter-utils/src/slot/policies.ts` holds `PROP_MERGE_POLICIES`, `policyHandlers`, and the
  concrete combinators (`chainHandlers`, `mergeClassNames`, `mergeStyles`) `applyMergePolicy`
  dispatches to.
- **Confirmed call path:** `compose`'s own code in `create-contract-component.ts` does not call
  `mergeSlotProps` directly. It sets `asChild: true` on `with` and renders it; `with`'s own normal
  render path then hits `Slot.tsx` → `applySlot` → `cloneSlotChild` → `mergeProps` (the React
  adapter's `mergeProps`, `adapters/react/src/shared/slot/mergeProps.ts`, is a direct re-export of
  `mergeSlotProps`). The policy table is reached **transitively**, through `asChild`, not bypassed —
  so typing `compose` accurately means typing what `asChild` composition already does, which is
  exactly this policy table.
- `ClassifyPropKey` (section 3) approximates `classifyProp`'s `EVENT_HANDLER_RE` check with a
  `on${string}` key-name pattern, since types can't additionally confirm "and both sides' _values_
  are functions" the way the runtime check does. This holds for every real contract-authored handler
  prop (always typed as a function on both sides) but is a genuine, named simplification, not a
  silent assumption — if `classifyProp`'s classification rule changes, `ClassifyPropKey` must be
  updated to match, and that drift risk should be called out at review time for any future change to
  either side.
- **Structural compatibility is not semantic compatibility, and this proposal does not claim
  otherwise.** The `child-wins` collision check
  (`Own[K] extends Composed[K] ? ... : Composed[K] extends Own[K] ? ...`) only asks whether the two
  declared _types_ are assignable — it cannot and does not ask whether the two components mean the
  same thing by that prop. Two components can both declare `size: 'sm' | 'lg'` — one meaning font
  size, the other meaning spacing — and this check passes silently, merging them as if compatible,
  because they structurally are. This is a real, accepted limitation of a type-level check, not a
  gap to close: no type system can verify semantic intent. The conservative policy here only catches
  the _obviously_ incompatible case (genuinely different type shapes); it should never be read as a
  guarantee that two colliding props sharing a type also share a meaning.
- **Not to be conflated with** `lib/primitive/src/utils/merge-props.ts`'s _different_, unrelated
  `mergeProps<T, P>(defaultProps, props)` — a nil-aware defaults-vs-props merge, applied when a
  contract's own `styling.defaults` are resolved against incoming props. This is what makes finding
  #32's "a child's own `defaults` can never win against anything the parent contributed" true: the
  defaults merge runs on the child's own render, _after_ the slot merge has already decided what the
  child's incoming props are — not before. `ContractGenericsWithComposeOf` types the pre-defaults,
  explicitly-passable surface, exactly like every other prop `ContractProps<T>` already exposes, and
  does not attempt to represent which composed keys will end up shadowed by a default at render
  time. That full-merge-result problem is already scoped and explicitly declined as a separate,
  harder ask (`<Container asChild>`/`mergeSlotProps` key-presence sensitivity, confirmed via a
  type-level spike on `spike/aschild-merged-props-typelevel`) — this proposal deliberately stays on
  this side of that line.
- The `child-wins` collision rule is the type-side consequence of `ComposeOptions`'s own doc
  comment: "forwarding is only safe when `with`'s own contract is known not to have variant/prop
  names that collide with this component's own." **Precisely stated, this is a lazy guarantee, not
  an eager one — confirmed by direct test, not assumed:**
  1. **The `compose: { with, allProps: true }` declaration itself always type-checks, collision or
     not.** `ComposeOptions.with: ComponentReference` has no type-level relationship to `C`'s own
     props at all, so there is no mechanism by which a collision could ever be rejected at the point
     `compose` is written — confirmed by a fixture with a real `radius` collision compiling with
     zero `@ts-expect-error` suppressions anywhere on the declaration.
  2. **A colliding key that nothing ever reads produces zero diagnostics, anywhere, ever.**
     `CollisionError<K>` lands as the _value type_ at that one key; a consumer that uses every
     _other_ key (`Omit<Resolved['props'], 'radius'>`) sees no error. A component composing two
     others with a real, unresolved collision can pass CI indefinitely as long as nothing happens to
     read that specific prop — this is not a hypothetical edge case, it's the default outcome for
     most of a composing component's own lifetime.
  3. **A variants collision was a real, separate bug, not a documentation nicety — now fixed and
     confirmed correctly, not assumed.** The original version of this entry claimed "non-colliding
     variant keys survive a `shadow` collision," backed by a test that checked
     `'size' extends keyof ContractProps<T>`. That test was a false positive: a real variant
     collision made the _entire_ merged `variants` object resolve to `never` (a raw
     `CollisionError<K>` string isn't structurally a `VariantStates`, so `PolymorphicGenerics`'s own
     `Variants extends Readonly<VariantMap>` constraint failed for the whole object, not just the
     colliding key) — and `keyof never` is `string | number | symbol` in TypeScript, so
     `'size' extends keyof never` is vacuously `true` regardless of whether `size` ever actually
     survived. Confirmed directly: before the fix, `ContractProps<typeof Card>['shadow']` was
     `never` (a real `string` failed to assign to it with "not assignable to type `never`", not the
     collision message). Fixed by giving `MergeComposedProps` a third parameter (`AsVariants`,
     `lib/compose-props/src/merge-policy.ts`) that wraps a variant collision as
     `VariantCollisionError<K>` — a single-key `Record<CollisionError<K>, never>`, which _is_ a
     valid `VariantStates` — instead of the raw string. Every call site audited (only two exist,
     `lib/compose-props/src/compose-generics.ts`): props merging omits the argument (defaults to
     `false`), variants merging passes the literal `true`. Every test that relied on the
     `extends keyof` presence check (all four wired adapters, this package's own suite) was
     rewritten to assert the colliding key's _exact_ value — `CollisionError<K> | undefined` — and
     the non-colliding keys' real values, through the real `ContractProps<typeof Component>`
     extraction path, not just the standalone helper. Each corrected assertion was itself
     sanity-checked by deliberately reverting to the old (wrong) expectation and confirming it now
     fails to compile.

  **Net effect:** read "resolves to `CollisionError<K>`" as "the type system can describe a known
  collision if asked," not "the type system rejects an invalid composition." Those are different
  guarantees, and only the first is actually delivered. Eager rejection at the `compose` call site
  would mean weaving collision detection into `createContractComponent`'s own parameter type — a
  materially bigger change than this package's scope (see "Next steps"), not a one-line addition to
  it, and not something this proposal currently delivers or claims to.

## 6. Adapter impact assessment

- **React — done.** `ContractProps<T, Mode>`
  (`adapters/react/src/shared/types/polymorphic-props.ts`) swapped to
  `ContractGenericsWithComposeOf<C>`. Validated against two and three real `createContractComponent`
  components, all three render modes, `as` narrowing in both directions, a non-composing control
  case, and the adapter's full existing suite (zero regressions). This is the reference
  implementation the other adapters' swaps were checked against.
- **Preact — done.** `adapters/preact/src/types/polymorphic-props.ts`: confirmed, by reading the
  actual source (not assumed), that Preact's pre-change projection was plain `ContractGenericsOf<C>`
  (not `ContractGenericsWithAllowedOf<C>` — that variant was React-only; Preact was already one step
  behind React's own prior state), recovered via the identical `HasContract`/`__contract` mechanism.
  Swapped the same way, validated the same way (real components, all available render modes — Preact
  has no `'render'` mode to begin with — `as` narrowing, a non-composing control case, nested
  composition, the collision decision), zero regressions in the existing suite.
- **Vue — done, with one adapter-specific test wrinkle worth recording.**
  `adapters/vue/src/types/polymorphic-props.ts`: same `HasContract`/`__contract` recovery, same
  pre-change `ContractGenericsOf<C>` projection, same safe swap, same validation coverage (adapted
  for Vue's `ContractProps<T>` having no `Mode` parameter — a flat union of both render-mode shapes,
  not a mode-selected single shape). One real finding along the way: Vue's
  `ControlProps`/`NormalProps`/`AsChildProps` never strip the index signature `UnknownProps`
  (`= AnyRecord`) intersects in, unlike React's/Preact's own
  `ComponentProps<G> = OmitIndexSignature<PropsOf<G>>` — a pre-existing characteristic of this
  adapter, not something this change introduced, but one that makes a bare
  `'key' extends keyof ContractProps<T>` presence check vacuously `true` for _any_ key on _any_ Vue
  component, composing or not. The adapter's own validation test wraps every such check in an
  explicit `OmitIndexSignature` for this reason (`adapters/vue/src/compose-props.test.ts`) —
  confirmed, by deliberately breaking the fixed version, that the unwrapped check really was a false
  positive before the fix.
- **Svelte — confirmed blocked, not merely unverified.** Investigated directly (not inferred):
  Svelte's analog, `GenericsOf<T>` (`adapters/svelte/src/types/resolved-slot-props.ts`), is

  ```ts
  export type GenericsOf<T extends AnyBuiltRuntime> =
    T extends BuiltRuntime<infer G, WithChildRules> ? G : PolymorphicGenerics
  ```

  — it recovers the already-projected `G` directly as a live type parameter (no marker needed, per
  that type's own doc comment, since `createContractComponent` returns `BuiltRuntime<G, TOptions>`
  un-erased), never `C` itself. `createContractComponent`'s actual return type
  (`adapters/svelte/src/create-contract-component.ts`) is `BuiltRuntime<ContractGenericsOf<C>, C>` —
  `C` is passed in, but `BuiltRuntime`'s own fields (`runtime`, `filterProps`, `slotValidator`,
  `onElement`, a bare non-generic `compose?: ComposeOptions`, `childrenEvaluator`) consume it only
  as the scrutinee of `BuiltChildrenEvaluator<TOptions>`'s conditional type — never stored in an
  `infer`-able position. There is no field anywhere that retains `C` itself. Reaching `compose` for
  Svelte needs either a new marker field on `BuiltRuntime` (undoing the "no marker needed" design
  the current approach is built on) or a changed return-type shape threading `C` through inferably —
  a real runtime-bundle-shape change, not a type-only swap in a `ContractProps`-equivalent file
  (Svelte doesn't have one to swap in the first place, since `GenericsOf<T>` is the whole
  mechanism).

- **Solid — done.** `adapters/solid/src/types/polymorphic-props.ts`: investigated independently (not
  assumed to share Svelte's shape or React's) and confirmed, by reading the actual source, that
  Solid's `PolymorphicComponent<G, C>` carries `readonly __contract?: C` and
  `createContractComponent`'s return type threads the full `C` through inferably — the identical
  `HasContract`/`__contract` mechanism React/Preact/Vue use, and the opposite of Svelte's
  `BuiltRuntime<G, TOptions>` (where `TOptions` is only ever a conditional-type scrutinee, never
  stored). `compose` is live runtime data there too (`renderComposed`,
  `adapters/solid/src/render.tsx`). Same pre-change `ContractGenericsOf<C>` projection, same safe
  swap, same validation coverage (adapted for Solid's `ContractProps<T>` having no `Mode` parameter,
  same reason as Vue — Solid's `PolymorphicProps<G>` already folds both render modes into one
  unioned type). `OmitIndexSignature` is already applied to `PropsOf<G>` in Solid's own
  `ControlProps`, so it does not share Vue's index-signature test wrinkle.
- **Lit, Web**: explicitly out of scope. `ComposeOptions`'s own doc comment states `compose` has no
  effect on these adapters — no `asChild` concept exists for either. Documented as a non-goal, not
  an oversight.

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
   own props/variants plus `Surface`'s ordinary props and variants. With `allProps: false`, the
   partner's ordinary props remain unreachable while its styling variants remain public. A `Card`
   with no `compose` field at all preserves its own props/variants exactly.
3. **Collision** — a same-named `child-wins`-category prop (`variant`) with incompatible types on
   both sides resolves to `CollisionError<'variant'>`, not a silently-wrong type.
4. **Nested composition** — `Surface` composing `Base`, `Card` composing `Surface`: `Card`'s
   resolved type includes `Base`'s `as` prop too. This is the assertion that **failed on the first
   implementation attempt** (projecting `Surface`'s raw contract instead of recursing on
   `ContractGenericsWithComposeOf<Surface>`) and drove the correction documented in section 3 —
   recorded here so the "recursion is close to free" framing isn't repeated uncritically by whoever
   implements this for real.

**Not covered by this spike** (adapter-specific; the dependency-free `contract-props` package can't
exercise them without importing adapter types): mode extraction
(`ContractProps<T, 'asChild' | 'render'>` still resolving correctly against the new generics) and
`as`/polymorphism interaction (confirming the composed type doesn't reproduce the
`'article' & 'div'` collapse-to-`never` failure the naive intersection workaround hit in finding
#54's own addendum). Both should be validated at the real per-adapter implementation site before
merge, as explicit follow-up checks — not assumed to pass by extension of this package-level spike.

## 8. Scope, risks, open questions

- **Scope:** small enough for a focused PR — the four new types in section 3 live in one package
  (placement below), plus a one-line internal change in each applicable adapter's `ContractProps`/
  `GenericsOf` wrapper. Proportionate to the problem, unlike the ancestry-channel proposal this repo
  already declined.
- **Placement question — resolved.** Implemented as a new package, `lib/compose-props`
  (`@praxis-kit/compose-props`), depending on both `@praxis-kit/primitive` and
  `@praxis-kit/contract-props` — option (b) from the original three, keeping both existing packages'
  dependency boundaries (`contract-props` stays dependency-free) untouched.
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
  1. `ContractPropsOf<C>` (`DeclaredPropsFrom`) deliberately intersects a component's declared props
     with `AnyRecord` — by design, not a bug. But once both sides of a merge carry that index
     signature, `keyof Own | keyof Composed` absorbs every literal key into the bare `string` the
     index signature already implies, silently degrading `MergeComposedProps`'s per-key logic to
     iterating over `string` instead of each contract's real declared keys. Fixed by running both
     sides through `OmitIndexSignature` (`type-fest`) **before** merging, not after.
  2. **A real bug, not a documentation gap, caught by a false-positive test before it was caught for
     real.** `MergeComposedProps` can produce a `CollisionError<K>` string for a colliding key — not
     a valid `VariantStates<string>`. Since `PolymorphicGenerics`'s own
     `Variants extends Readonly<VariantMap>` constraint is checked against the _whole_ merged
     variants object, a raw string at one key's position failed that check for the entire object,
     collapsing every variant — not just the colliding one — to `never`. The first regression test
     written for this ("non-colliding variants survive") passed anyway, because it asserted
     `'size' extends keyof ContractProps<T>`, and `keyof never` is `string | number | symbol` in
     TypeScript — a vacuous pass that caught nothing. Caught for real only once the assertion was
     rewritten to check the colliding key's _actual value_ via `tsc`'s own error message
     (`Type 'string' is not assignable to type 'never'`, not the collision text). Fixed with a third
     parameter on `MergeComposedProps` (`AsVariants`, `merge-policy.ts`) that wraps a variant
     collision as `VariantCollisionError<K>` — a single-key `Record<CollisionError<K>, never>`,
     which _is_ a valid `VariantStates` — instead of the raw string, so the surrounding object stays
     valid and only the colliding key itself becomes unusable. See section 5's own entry for the
     full account and the corrected tests across every wired adapter plus this package's own suite.
  3. The same "guard every argument, not only the one with an obvious constraint violation" lesson
     from point 2 generalized further than first thought: `TAllowed`/`enforcement.allowedAs` hit an
     identical failure mode unguarded (silently widening to the full default `ElementType`), caught
     only once a _real_ `createContractComponent` component with `enforcement.allowedAs` entered the
     test matrix — neither this package's own mocked spike nor its first real-contract tests used
     that field. Every argument to the internal `PolymorphicGenerics<...>` call is now guarded for
     this reason, not only the ones a specific test happened to exercise.
  4. `MergeComposedProps`'s key set (`keyof Own | keyof Composed`) isn't a plain `keyof` of one
     type, so it isn't a homomorphic mapped type — TypeScript silently drops every `?` modifier
     rather than preserving it, turning a genuinely optional own-prop into a required-but-possibly-
     `undefined` one. Caught the same way as point 3: neither the mocked spike nor the first
     real-contract tests happened to use an optional prop. Fixed by computing per-side optionality
     explicitly (`OptionalKeysOf`, `lib/compose-props/src/merge-policy.ts`) and splitting the merge
     into separate required/optional mapped types.
- **Collision validation — decided, not left open: a downstream diagnostic, not declaration-site
  rejection.** What's actually delivered: a colliding key's value becomes a self-describing
  `CollisionError<K>` string instead of silently picking a side. What's _not_ delivered, and is not
  planned for this proposal: rejection of the `compose: {...}` declaration itself, or any guarantee
  that an unconsumed collision will ever surface as a visible diagnostic. This is a conscious
  choice, not an unresolved gap — see section 5 for the full reasoning — because eager,
  declaration-site rejection would require weaving collision detection into
  `createContractComponent`'s own parameter type (every component's call to the factory, not only
  composing ones, would need to cross-check against `compose.with`'s contract), a materially bigger
  and differently-shaped change than this package's scope, and a stronger guarantee than the runtime
  itself provides (`ComposeOptions`'s own doc comment states collision safety is advisory, not
  enforced, at the runtime level either — matching the type system's guarantee to the runtime's own,
  rather than overpromising). Locked in by a dedicated test
  (`lib/compose-props/src/compose-generics.test.ts`, "design decision" case) so a future change to
  this behavior is a conscious decision, not a silent regression. Do not describe this mechanism as
  "rejecting an invalid composition" in any future summary of this work — it describes one, lazily,
  if and only if something later tries to use the colliding key.
- **Acceptance criteria:** all spike assertions (section 7) pass under `tsc --noEmit` — confirmed,
  `pnpm --filter @praxis-kit/compose-props typecheck && test` passes (9/9 as of this writing; the
  count will keep growing as regressions get their own named test), and a full workspace
  `pnpm -r typecheck` confirms no existing component's `ContractProps<T>` extraction changed. **Now
  true, not aspirational:** `ContractProps<T>` in React, Preact, Vue, and Solid
  (`adapters/{react,preact,vue,solid}/src/.../polymorphic-props.ts`) all consume
  `ContractGenericsWithComposeOf<C>` directly — `praxis-components`' `CardProps` pattern can drop
  its hand-extension once it upgrades to a release containing this change. Svelte is confirmed
  blocked (section 6); Lit/Web are out of scope by design.

## Alternatives considered

1. **Status quo** — hand-maintained `CardProps & SurfaceProps`-style alias per composing component.
   Rejected: confirmed broken twice over in finding #54's own addendum — a plain intersection
   collapses `as` to `never` (both sides use the single-type-argument `PolymorphicProps<G>` form,
   narrowing `as` to each component's own default-tag literal before intersecting); even once that's
   worked around, the result still doesn't match `Parameters<typeof Card>[0]`, the real
   compiler-resolved call signature.
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
2. ~~Fill the untrusted-`with` spike gap.~~ Done — covered in `compose-generics.test.ts`.
3. ~~Swap React's `ContractProps` to `ContractGenericsWithComposeOf`.~~ Done — validated against two
   real `createContractComponent` components across all three render modes, `as` narrowing in both
   directions, a non-composing control case, and the adapter's full existing suite (zero
   regressions). React is the reference implementation for the remaining adapters.
4. ~~Decide the collision-validation acceptance criterion.~~ Done — section 8's own entry: a
   downstream diagnostic, not declaration-site rejection, locked in by a dedicated test.
5. ~~Add a real-component integration test for nested composition.~~ Done — `Card → Surface → Base`
   validated through the real public `ContractProps` extraction path in React, Preact, Vue, and
   Solid.
6. ~~Audit Svelte's extraction path.~~ Done — confirmed blocked, not merely unverified (section 6
   has the full investigation). Reaching `compose` there needs a runtime-bundle-shape change
   (threading `C` itself through `createContractComponent`'s return type, or a new marker field),
   not a type-only swap — out of scope for this proposal as written.
7. ~~Extend the swap to Preact and Vue.~~ Done — same `HasContract`/`__contract` mechanism, same
   pre-change `ContractGenericsOf<C>` projection, same safe swap, validated independently per
   adapter rather than assumed. Vue surfaced one adapter-specific, pre-existing test wrinkle
   (section 6) unrelated to this change's own correctness.
8. ~~Audit Solid independently.~~ Done — confirmed safe, same mechanism as React/Preact/Vue, not
   Svelte's blocked shape. Swapped and validated the same way; no Vue-style index-signature wrinkle
   (Solid's own `ControlProps` already applies `OmitIndexSignature`).
9. **Remaining:** Lit/Web are out of scope by design (`ComposeOptions`'s own doc comment — no
   `asChild` concept exists for either). No further adapters to assess; this proposal's rollout is
   complete modulo Svelte's separately-tracked runtime-shape decision.
10. **Superseded detail — incompatible variant collisions keep the primary's values.** Items above
    describe the colliding variant key as unusable (`CollisionError<K> | undefined`). That no longer
    matches the canonical contract (the primary definition wins, the collision is surfaced, and a
    value valid only under the partner's conflicting definition is not accepted). A colliding
    variant is now `Own[K] & VariantCollisionError<K>` (`merge-policy.ts`), so the consumer-facing
    prop is `<primary values> | CollisionError<K> | undefined`. Pinned by the "incompatible variant
    collision — public prop type" tests in `compose-generics.test.ts` and each wired adapter's
    collision assertion. Svelte's extraction limitation (section 6) is unchanged and still open.
