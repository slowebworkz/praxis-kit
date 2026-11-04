# Design plan: class-plugin integration for composition

**Status:** Implemented and merged to `develop` (PR #167); `pnpm verify:release` passes. All phases
are done except two Phase 4 test-coverage items (React legacy parity and adapter-level
identical-factory coverage), tracked below. Acceptance criterion 5 is half covered: explicit props
overriding `compose.defaults` is tested, but the plugin's multiple-display policy is not exercised
through composition. This document itself makes no runtime changes.

**Workstream:** `feature/tailwind-composition-plugin-integration`

## 1. Problem statement

The composition styling resolver currently merges the primary component's and its direct Praxis
partner's standard styling metadata, then calls `createClassPipeline` directly. The normal component
path instead runs the configured `styling.plugin` factory through `resolveClassPlugin`, including
plugin-shape validation and pipeline guarding.

Consequently, a component configured with `createTailwindPipeline` behaves correctly without
`compose.with`, but its composition resolver bypasses Tailwind's pipeline. A primary `flex` prop is
not interpreted as a layout input, `flex` is not injected into the final classes, incompatible
layout-family utility tokens such as `grid-cols-3` are not filtered, and the plugin-owned `flex`
prop can reach a DOM element and trigger a React warning.

The composition behavior contract in `.vscode/COMPOSE.md` deliberately deferred plugin activation
and plugin-owned internal variants to a separate workstream. This document defines that follow-up;
it does not broaden the composition feature's original acceptance criteria.

## 2. Goals

- Run the selected existing class-plugin factory once against the merged primary/partner styling
  options.
- Preserve the current plugin contract (`ClassPluginFactory`, `ClassPlugin.pipeline`,
  `ClassPlugin.ownedKeys`) and the normal plugin validation/guarding path.
- Make the selected plugin's owned props available to combined class resolution independently of
  `compose.allProps`.
- Prevent plugin-owned props from leaking to the composed child or host DOM through ordinary prop
  forwarding or `compose.defaults`.
- Keep selection, merged style semantics, and owned-prop policy in framework-independent runtime
  code; keep rendering/forwarding changes in adapters.
- Preserve the default class pipeline for compositions whose selected contract has no plugin.
- Cover the composition-enabled adapters and both current and legacy React paths where applicable.

## 3. Non-goals

- Do not change `lib/tailwind`'s `createTailwindPipeline` implementation to add composition-specific
  behavior.
- Do not add a Tailwind CSS `@plugin` directive, Tailwind-specific behavior to `packages/core`, or a
  Tailwind build/scanning integration in this workstream.
- Do not combine or sequentially execute arbitrary plugin pipelines. A composed result must be
  processed by one selected pipeline.
- Do not change composition variant collision, recipe, compound, default precedence, custom-render,
  or `asChild` semantics except where needed to pass the selected pipeline's owned inputs and strip
  reserved props.
- Do not make claims about generated CSS availability. Tailwind source registration/safelist
  behavior remains a separate build-time concern.
- Do not expand composition to adapters that do not currently expose the composition
  resolver/rendering surface without a separate scope decision.

## 4. Proposed behavior contract

### 4.1 Plugin selection

Use the existing generic `ClassPluginFactory` interface. The proposed initial selection policy is:

1. If the primary component declares a plugin factory, select it.
2. Otherwise, if the retained direct partner metadata declares a plugin factory, select the partner
   factory.
3. If neither declares a factory, use the existing standard class pipeline.
4. If both declare the same factory function, instantiate it once against the merged options.
5. If both declare different factories, select the primary factory and emit a construction-time
   composition diagnostic. Do not attempt to merge arbitrary plugin policies.
6. If the direct partner is not a Praxis component with retained metadata, keep the existing
   external-partner fallback. Do not fabricate metadata or infer a plugin from framework component
   internals.

The factory must receive the **combined** `ClassPipelineOptions`, not either contract's individual
options. Use the primary runtime's configured `Diagnostics` instance so the plugin's existing
diagnostics behavior remains consistent with ordinary component construction.

The different-factory diagnostic needs a new stable diagnostic code in
`lib/diagnostics/src/codes.ts`, a `Composition` category, formatter/registry coverage as required by
the diagnostics system, and a documented message. Confirm the code assignment against the current
diagnostics catalogue before implementation.

### 4.2 Retained metadata

The composition metadata currently retains base classes, variants, defaults, compounds, recipes, and
tags, but intentionally drops the plugin factory. Extend this _internal_ metadata shape to retain
the originating `ClassPluginFactory` as a separate field; it is executable configuration, not a
style field to merge into `ClassPipelineOptions`.

The metadata must retain the factory from the original factory options. `resolveFactoryOptions`
currently produces the normalized standard styling shape and does not retain `styling.plugin`, so do
not assume `bundle.runtime.options` contains the factory. Thread the original factory through the
shared runtime/metadata attachment boundary explicitly.

Continue excluding per-contract `precomputedClasses` from the merged result: neither contract's
precomputed class string is valid for the combined pipeline.

### 4.3 Combined pipeline and owned props

Refactor composition styling so that metadata merging and class-pipeline construction are separate
responsibilities:

- Merge standard styling metadata using the established partner-first / primary-second rules.
- Pass the merged options, the selected factory, and primary diagnostics through the same validation
  and guarded-pipeline path used by `resolveClassPlugin`.
- When no factory is selected, retain the current standard-pipeline behavior.
- Return the selected plugin's `ownedKeys` alongside the composition class resolver. Do not infer
  owned props from Tailwind's name or hard-code display keys in core.
- Make selected plugin-owned prop values available to the composition resolver even when
  `compose.allProps` is false. This is styling input, not ordinary prop forwarding.
- Treat reserved owned keys from the primary and composition-selected plugin as internal at the
  adapter boundary. They may affect class calculation but must not be emitted as DOM attributes or
  blindly forwarded to `compose.with`.

A plugin factory may return an owned-key set that differs from the primary component's standalone
plugin instance because it was constructed from merged options. The composition resolver's owned-key
set is therefore authoritative for the composed resolution path; the adapter's complete reserved-key
filter should account for both the regular component pipeline and the composition pipeline.

### 4.4 `compose.defaults` and explicit props

`compose.defaults` must remain a lower-priority composition fallback, according to the existing
selection rules. Plugin-owned defaults must also be removed from the raw props/defaults forwarded to
the child. Ensure those values remain available to the composition styling resolver through the
composition-defaults path rather than being accidentally reinterpreted as explicit consumer
selections.

Explicit consumer layout props take precedence over `compose.defaults` for the same owned key.
Multiple simultaneously true display props must continue to use the existing plugin's canonical
resolution and diagnostic behavior; composition must not invent another ordering rule.

### 4.5 Adapter behavior

The shared runtime should make the composed resolver and its owned keys available to adapters.
Framework adapters should only:

- include selected owned-prop values in the composed resolver inputs;
- remove all reserved owned keys from host-facing props;
- remove composition-owned keys from `allProps` forwarding and child defaults;
- preserve the current automatic composition vs explicit `asChild`/custom `render` precedence.

Keep the existing contract-local class pipeline for ordinary renders. The composition-selected
pipeline applies only when the automatic composition resolver is actually used.

## 5. Implementation phases

### Phase 0 — Lock the compatibility policy

- [x] Confirm the selection policy in §4.1: primary factory wins; otherwise partner factory;
      distinct factories produce a diagnostic.
- [x] Decide and allocate the new diagnostic code (`COMP1016`, `CompositionPluginConflict`;
      uniqueness pinned by `codes.test.ts`; emitted in Phase 2).
- [x] Record the behavior in `DECISIONS.md`, including that this does not imply arbitrary plugin
      composition or nested-plugin cascading.

### Phase 1 — Separate merged options from pipeline construction

- [x] Refactor `lib/styling/src/create-composition-class-pipeline.ts`
      (`mergeCompositionClassPipelineOptions`) so the merged `ClassPipelineOptions` can be produced
      independently from constructing the default pipeline.
- [x] Preserve the established composition merge semantics and regression coverage (class order,
      variant collisions, defaults, recipes/presets, compounds, tags, caller class, and no
      precomputed-class reuse). Run the focused suite before considering this verified.
- [x] Add `createSelectedCompositionClassPipeline` in core. It accepts composition style options,
      the selected `ClassPluginFactory`, and diagnostics; merges options, defaults to the ordinary
      class pipeline when no factory is selected, and uses `resolveClassPlugin` for the existing
      `assertPluginShape`/`guardPipeline` protections. A focused test covers merged options,
      one-time factory invocation, diagnostics forwarding, and the no-plugin fallback.
- [x] Avoid importing `@praxis-kit/tailwind` or checking Tailwind-specific identifiers in
      `packages/core`, `lib/styling`, or `lib/adapter-utils`. Verified: no non-test Tailwind
      references in these packages beyond two pre-existing comments.

### Phase 2 — Carry plugin metadata and selection through core

- [x] Extend internal retained composition metadata with an optional plugin factory separate from
      the style options.
- [x] Thread the original `styling.plugin` from the factory input to retained component metadata; do
      not depend on normalized options that have discarded it.
- [x] Update `packages/core/src/factory/composition-style.ts` and
      `packages/core/src/factory/create-polymorphic.ts` to select the factory, emit the conflict
      diagnostic when needed, and instantiate exactly one pipeline with combined options.
- [x] Expose the selected composition plugin's `ownedKeys` on `CompositionClassResolver` without
      changing the public component API unnecessarily.
- [x] Preserve the existing fallback for external/unannotated `compose.with` targets.
- [x] Run focused core and adapter-utils tests and typechecks before treating Phase 2 as verified.

### Phase 3 — Propagate owned keys through adapters

- [x] Update `lib/adapter-utils/src/runtime/build-core-runtime.ts` and shared built-runtime types so
      the effective reserved keys include the ordinary plugin's keys and the composition resolver's
      keys.
- [x] Extend `composeStyleProps` (or a small shared helper) to copy selected owned props into
      composition resolver inputs even when `allProps` is false.
- [x] Filter the effective reserved keys from the host-facing prop shape, `compose.allProps`
      forwarding, and `compose.defaults` forwarding.
- [x] Verify existing framework-specific prop spread/slot/snippet/reactivity behavior through tests.
- [x] Verify dynamic/reactive adapters (especially Solid and Svelte) continue to react to changes in
      owned layout props; don't capture the initial prop value in a stale object. Covered by the
      Solid and Svelte owned-prop reactivity tests.

### Phase 4 — Regression coverage

- [x] Unit tests for the style-option merge helper and generic selected-plugin factory invocation.
- [x] Core tests for primary-only plugin, partner-only plugin, identical factories, different
      factories/diagnostic, neither plugin, and missing partner metadata.
- [x] Metadata tests prove the original plugin factory is retained but `precomputedClasses` is still
      omitted.
- [x] Shared conformance tests prove plugin-owned prop values reach the combined resolver with both
      `allProps: true` and `allProps: false`, and are not forwarded as host attributes;
      partner-plugin defaults and explicit `false` overrides are covered.
- [ ] React current and legacy integration tests for partner plugin, identical factories,
      conflicting factories, `compose.defaults`, explicit consumer override, and
      automatic-composition precedence vs `asChild`/custom `render`. **Open:** React current has
      real-Tailwind, conflict, `asChild` and custom-`render` tests; React legacy has only the
      real-Tailwind test. No adapter-level identical-factory test (covered in core and the shared
      conformance). Add a `flex` + `grid` composition test for criterion 5.
- [x] React current and legacy integration tests exercise the real Tailwind factory on merged base
      classes, layout utility filtering, and host prop filtering.
- [x] Shared owned-prop conformance coverage runs through Preact, Vue, Solid, and Svelte composition
      surfaces; add framework-specific Tailwind tests only where their prop/render behavior differs
      from the shared path.
- [x] Reuse existing `lib/tailwind/src/create-tailwind-pipeline.test.ts` semantics as the oracle:
      flex-mode output includes the appropriate display class, strips incompatible grid-family
      container utilities, and retains applicable utilities. The existing Tailwind unit suite
      remains authoritative for multiple-display diagnostic/order behavior.

### Phase 5 — Verification and documentation

- [x] Run focused tests first (`lib/styling`, `packages/core`, `lib/adapter-utils`, and composition
      tests for each supported adapter).
- [x] Run formatting, lint, typecheck, and the full monorepo test suite.
- [x] Review bundle-size deltas because composition now constructs a second plugin instance for the
      merged path; avoid invoking a factory per render. Measured: about +200–270 B gzip per
      scenario, under 1%; the factory runs at construction, not per render.
- [x] Run `pnpm verify:release` and review generated metrics deliberately. Soft warnings only
      (expected API and LOC growth in core, styling, adapter-utils); snapshot committed.
- [x] Update `docs/concepts.md` and `lib/tailwind/README.md` to explain that plugin behavior applies
      to the combined runtime class pipeline, while Tailwind CSS generation/source detection remains
      the consumer/build's responsibility.
- [x] Remove or resolve any exploratory tests that are superseded by the committed cross-adapter
      conformance suite. The exploratory React Tailwind tests are now committed, passing integration
      tests; nothing superseded remains.

## 6. Acceptance criteria

The workstream is complete when all of these are true:

1. Without `compose.with`, a Tailwind-enabled component's output is unchanged.
2. With a retained Praxis partner, the composition-selected factory receives the merged style
   metadata and is instantiated once per component construction (not per render); the normal
   component pipeline may also instantiate its own plugin for non-composed renders.
3. With `flex` as a primary or partner styling input, the composed output contains `flex`; the
   Tailwind plugin's existing incompatible-token filtering is applied to the merged classes (for
   example, `grid-cols-3` is stripped in flex mode while applicable utilities remain).
4. The `flex`/`grid`/other plugin-owned props do not appear as host DOM attributes or leak through
   raw forwarding/defaults, regardless of `compose.allProps`.
5. Explicit layout props override composition defaults, and the plugin's existing multiple-display
   conflict policy is preserved.
6. Primary-only, partner-only, identical-factory, conflicting-factory, no-plugin, and
   external-partner paths have deterministic, tested behavior.
7. Existing composition and ordinary plugin tests pass across every supported composition adapter.
8. No Tailwind-specific implementation branch is added to `packages/core` or the generic composition
   merge algorithm; `lib/tailwind` requires no composition-only code change.

## 7. File-level starting points

- `packages/core/src/factory/create-polymorphic.ts` — normal and composition pipeline construction;
  diagnostics.
- `packages/core/src/factory/composition-style.ts` — partner metadata lookup and composition
  resolver creation.
- `packages/core/src/factory/pipelines/styling.ts` and `plugin-invariants.ts` — existing generic
  factory invocation, shape validation, and pipeline guard.
- `lib/styling/src/create-composition-class-pipeline.ts` and `lib/styling/src/types/composition.ts`
  — merged style options and resolver metadata.
- `lib/adapter-utils/src/runtime/composition-style-metadata.ts` — retained metadata,
  `composeStyleProps`, and plugin-owned resolver inputs.
- `lib/adapter-utils/src/runtime/build-core-runtime.ts` — effective owned-key propagation.
- `adapters/react/src/current/create-contract-component.test.tsx` — existing exploratory entry
  point; expand the committed tests only alongside implementation.
- `adapters/react/src/legacy/create-contract-component.ts`,
  `adapters/preact/src/create-contract-component.ts`,
  `adapters/vue/src/create-contract-component.ts`, `adapters/solid/src/render.tsx`,
  `adapters/solid/src/create-contract-component.ts`, and
  `adapters/svelte/src/create-contract-component.ts` — framework prop/render boundaries.
- `lib/tailwind/src/create-tailwind-pipeline.test.ts` — source of truth for existing layout
  filtering and diagnostics behavior; no plugin implementation change is planned.
- `lib/diagnostics/src/codes.ts` plus diagnostic tests — distinct-plugin conflict diagnostic.
