# Praxis UI Optimization Roadmap

## Purpose

This document tracks performance, complexity, architecture, and developer-experience optimizations
identified during repository reviews.

---

## Priority Levels

| Priority | Meaning                            |
| -------- | ---------------------------------- |
| P0       | Immediate, measurable value        |
| P1       | High value, benchmark before merge |
| P2       | Nice improvement                   |
| P3       | Research only                      |

---

## P0 — Rule Matching Optimization

### Status

- [x] Indexed rule matching introduced
- [x] Typed rule dispatch
- [x] Predicate-rule fallback path

### Goal

Reduce:

```text
O(children × rules)
```

toward:

```text
O(children + rules)
```

for common contracts.

### Follow-up Tasks

- [x] Benchmark current matcher
- [x] Benchmark large component trees
- [x] Measure typed vs predicate-heavy contracts
- [x] Document matcher architecture

### Matcher Architecture

Two-phase dispatch in `RuleMatcher` (`lib/contract/src/children/rules-matcher.ts`):

**Construction** — `buildPartialIndex(rules)` partitions rules once:

- Rules with a unique `type` field → `Map<type, ruleIndex>` (O(1) lookup per child)
- Rules without `type`, or with a duplicate `type` → `untypedIndices[]` (linear scan)

**Match loop** — per child:

- Phase 1: `getChildType(child)` → Map lookup → O(1) dispatch if the child has a `.type`
- Phase 2: linear scan over `untypedIndices`, one `rule.match(child)` call per rule

Complexity: **O(n)** when all rules are typed; **O(n × m_untyped)** for predicate-only contracts.

**Measured results** (`lib/bench/src/children.bench.ts`):

| Children | All-typed | All-predicate (4 rules) | Δ    |
| -------- | --------- | ----------------------- | ---- |
| 10       | 86,174 hz | 81,279 hz               | ~6%  |
| 50       | 53,071 hz | 40,194 hz               | ~32% |
| 100      | 34,134 hz | 28,250 hz               | ~21% |
| 500      | 9,510 hz  | 7,443 hz                | ~28% |
| 1000     | ~4,800 hz | ~3,800 hz               | ~26% |

Typed dispatch benefit grows with children count and rule count. At 4 rules the saving is ~20–32%;
contracts with more predicate rules will scale worse on the predicate path.

### Success Metrics

- Reduced comparisons
- No correctness regressions
- No increase in public API complexity

---

## P1 — Single-Pass Validation Engine

### Problem

Children validation performed two full O(n) traversals of the children array:

1. `RuleMatcher.match()` — built the forward/reverse match matrix
2. `MatchValidator.validate()` — re-walked children to check the matrix for unexpected/ambiguous

### Implementation

`RuleMatcher.match()` now detects unexpected and ambiguous children inline during the match loop,
returning `unexpectedIndices` and `ambiguousIndices` alongside the `MatchMatrix`.
`ChildrenEvaluator` and `diagnoseChildren` access only violating elements by index rather than
re-traversing the full array. `MatchValidator` was deleted — its logic is fully subsumed.

On the happy path (no violations): second O(n) traversal eliminated entirely. On the violation path:
access reduced to O(k) where k = number of violating children.

Source: `lib/contract/src/children/rules-matcher.ts`, `children-evaluator.ts`

### Tasks

- [x] Identify traversal points
- [x] Build traversal inventory
- [x] Prototype unified validator pass
- [x] Benchmark before/after

---

## P1 — Rule Index Expansion

### Goal

Determine whether more rule categories can be indexed.

### Findings

**ARIA rules** (`lib/contract/src/aria/`) are pure function closures
`(context: AriaContext) => AriaResult[]` with no key field. There is no discrete tag, role, or
identifier on the rule shape that could be used as a Map key. Indexing would require restructuring
the rule API, which is not justified for a static 4-rule pipeline.

**Slot validation** (`lib/adapter-utils/src/slot-validator.ts`) is not a matching engine — it
validates `asChild`/`as` exclusivity and child count directly, with no rule collection to index.

**Children rules** by component type remain the only applicable indexing dimension (already
implemented in P0). The fallback-frequency bench suite confirms ~20–32% throughput gap at 4 rules;
contracts with more untyped rules will scale worse on the predicate path.

Source: `lib/bench/src/children.bench.ts` — `RuleMatcher — rule index expansion` suites

### Tasks

- [x] Audit rule implementations
- [x] Categorize indexed vs predicate rules
- [x] Measure fallback-rule frequency

---

## P1 — Contract Resolution Cache

**Already implemented.** `resolveContract()`, `resolveRole()`, `resolveVariant()` named in this item
do not exist as standalone functions. The two actual hot paths both have LRU caches:

- `VariantClassResolver` — `Map<string, string>`, LRU eviction at 1000 entries
  (`lib/styling/src/variant-class-resolver.ts`)
- `AriaPolicyEngine` — `#planCache` keyed on aria-\* prop fingerprint, LRU at 100 entries
  (`lib/contract/src/aria/polymorphic-validator.ts`)

- [x] Profile lookup frequency
- [x] Add benchmarks
- [x] Validate memory footprint

---

## P1 — Build-Time Generation

**Already implemented.** `packages/vite-plugin` already performs static work at build time:

- `static-compose.ts` — inlines `createContractComponent` factory calls
- `class-extract.ts` — extracts variant class strings at compile time
- `slot-transform.ts` — rewrites slot directives statically
- `diagnose.ts` / `diagnose-aria.ts` — ARIA and contract validation at build time

Candidate areas listed (variant expansion, contract/role/slot metadata) are covered.

- [x] Inventory runtime computations
- [x] Mark build-time candidates
- [x] Benchmark generated output

---

## Shipped — isObject Utility

Centralised `value !== null && typeof value === 'object'` into `isObject()` in
`@praxis-ui/primitive` (`lib/primitive/src/utils/is-object.ts`). Used in `RuleMatcher`, its tests,
and bench predicates. Exported alongside `assertNever`, `cn`, `mergeProps`.

**Bundle note:** Added ~267 bytes gzip to contract-bearing scenarios. Gzip baseline updated in
`packages/tree-shaking-tests/snapshots/gzip.json`.

---

## P2 — Child Normalization Reuse

**Already optimized.** Audit found each adapter normalizes children once and reuses the result:

- React / Preact — `once()` lazy getter memoizes `normalizeChildren()` across evaluator and slot
  resolution
- Vue — single `normalizeChildren(slots)` call, result passed to both evaluator and
  `tryRenderAsChild`
- Solid — was calling `toChildArray()` outside a reactive context (evaluated once at init only);
  fixed in this cycle by wrapping in `createEffect` so validation re-runs reactively when children
  change

No shared normalization model needed — each adapter's child type is framework-specific
(ReactElement, VNode, Preact element, Solid accessor).

- [x] Audit adapters
- [x] Inventory normalization logic
- [x] Extract shared model

---

## P2 — Parent Context Propagation

**Not applicable.** Full audit of `lib/` and `packages/` found no ancestor-walking patterns
(`findParent`, `findAncestor`, `getParent`, `traverse`, `walk`). Components are isolated polymorphic
units with no hierarchical context coupling. No optimization opportunity exists.

- [x] Search for ancestor lookups
- [x] Measure frequency
- [x] Prototype context propagation

---

## P2 — Runtime Allocation Audit

**Addressed.** Key hot-path allocations audited:

- `RuleMatcher.match()` — `Map`/`Set` allocations per call are unavoidable given the bidirectional
  match matrix design; acceptable given dev-only evaluation
- `applyFilter()` — new object per render is unavoidable (must produce a new filtered props object)
- `VariantClassResolver` — LRU cache already prevents CVA re-evaluation on repeated prop sets
- Solid `toChildArray()` — was re-allocating eagerly; folded into `createEffect` (now only runs when
  children change)
- Error-path `.map()` in `ChildrenEvaluator` — violation-only path, not a hot concern

- [x] Allocation profiling
- [x] Benchmark hot paths
- [x] Consolidate passes where appropriate

---

## P2 — Adapter Duplication Audit

**Addressed.** Duplicated `buildValidators` helper removed from React, Vue, and Preact — logic
inlined directly into `buildRuntime`, matching the existing pattern in Solid and Svelte. Fixed Solid
and Svelte omitting the component name from `buildEngines` (children error messages now include
component name across all five adapters).

Remaining cross-adapter duplication (React/Preact render logic, ~140 lines of shared slot handling)
is framework-API-coupled and not extractable without a new abstraction layer.

- [x] Run duplication analysis
- [x] Extract shared utilities
- [x] Increase adapter test coverage

---

## P3 — Runtime Plugin Discriminant

`buildCoreRuntime` currently uses `'classPlugin' in runtime` to detect whether a styling plugin was
provided. This is correct and idiomatic TypeScript structural narrowing, but it:

- Couples the check to the literal property name `classPlugin`
- Does not scale cleanly if the plugin system expands (e.g. `slotPlugin`, `themePlugin`,
  `animationPlugin`) — each new optional plugin would need its own `in` guard

A cleaner long-term shape would be an explicit discriminant on the runtime:

```ts
runtime.hasStyling // boolean
// or
runtime.plugins.class // ClassPlugin | undefined
// or
runtime.getPlugin('class') // type-safe lookup
```

This requires changing `PolymorphicRuntime` in `packages/core`, which is a public API change. There
is currently one call site (`buildCoreRuntime`), so the urgency is low. Scope with any future plugin
API expansion.

- [ ] Evaluate discriminant vs. plugin-map design
- [ ] Update PolymorphicRuntime type
- [ ] Migrate single call site in buildCoreRuntime

---

## P2 — Preset / variant reference validation

Surfaced while building the Box examples (the invented `grid2` preset).

**Primary rule:** every variant key referenced inside a `presets` selection must be defined in the
`variants` const. A preset that references an undefined variant key (or an undefined value of a
defined key) should `console.warn` — or throw under `strict: 'throw'`. This is enforced at compile
time today via `VariantSelection<V>`, but untyped JS consumers and `as`-cast escapes bypass it, so
the contract runtime should mirror it.

**Related gaps (same silent no-op class):**

- A `variantKey` prop that names no defined preset resolves to nothing, silently.
- A variant prop given an undefined _value_ (`<Box size="huge">`) or an unknown variant _prop_
  resolves to no class via CVA, silently. Type-caught in typed usage, but untyped/cast consumers
  bypass it.

Same treatment — warn/throw rather than no-op, gated on `strict`.

**Authoring convention (docs, not code):** a variant may be named anything, including `grid2`, only
if its classes are ordinary utilities unrelated to the adapter-internal `flex`/`grid` display mode.
The display mode is owned by the Tailwind plugin (mutually-exclusive `LayoutMode`); users must never
attempt to drive it through a user-defined variant.

This convention applies **only to components using `createTailwindPipeline`.** A component with no
layout plugin has no `LayoutProps`, so `flex`/`grid` carry no special meaning — variants may use or
be named after them freely. The rule scopes itself automatically: the reserved-literal check (Tier 1
below) lives inside the Tailwind plugin's `pipeline()`, so a plugin-less component never executes
it.

Scope is the runtime mirror of the existing type contract, not a stricter new rule. Lives in
`@praxis-ui/core` (`validateFactoryOptions`, called from `createPolymorphic`); severity gated on
`strict`, dev-only (tree-shaken from production).

Construction-time (shipped — PR #87, `feat/preset-variant-validation`):

- [x] Warn/throw when a `presets` selection references an undefined variant key or value
- [x] Warn/throw when a `defaults` entry references an undefined variant key or value (bonus)
- [x] Gate on `strict` (`'warn'` → console.warn, `'throw'`/`true` → throw, `false` → silent)
- [x] Dev-gated so it tree-shakes from production; `null`/`undefined` treated as "unset" (skipped)
- [x] Unit coverage (`validate-factory-options.test.ts`)

Render-time (deferred — needs `strict` threaded into the class resolver, which
`ClassPipelineOptions` doesn't currently carry):

- [ ] Warn/throw on unknown `variantKey` (names no defined preset)
- [ ] Warn/throw on an undefined variant value / unknown variant prop at the call site
- [ ] Document the variant-naming convention (no flex/grid display control via variants — Tailwind
      plugin only)

---

## P2 — Tailwind layout-mode contract (`none` is a real mode + reserved display literals)

Surfaced via the Box examples. Two coupled defects in `@praxis-ui/tailwind`.

**Defect 1 — `none` is a passthrough, not a mode.** `resolveLayout` returns `undefined` when neither
`flex` nor `grid` prop is set, and the pipeline does `if (!layout) return raw` — so the raw CVA
output (including any `grid`/`grid-cols-2` baked into variants) passes through unfiltered.

Rule: when both `flex` and `grid` are unset, `LayoutProps` mode is **`'none'`**, not absent.
`resolveLayout` should yield `'flex' | 'grid' | 'none'` (never `undefined`); the `return raw`
short-circuit is removed; the filter always runs. `LayoutMode` already includes `'none'`. `none`
strips both layout families + display literals + gap (the evaluator already does this for a
non-matching mode). `LayoutState` must take the mode explicitly and drop its `hasFlex`/`hasGrid`
token-inference, so a variant's `grid` literal can't re-derive a mode (the bypass).

**Defect 2 — silent stripping has no diagnostic.** A variant emitting `"grid grid-cols-2"` is erased
silently depending on the consumer's `flex`/`grid` prop; the author gets no signal. Making `none`
strip (Defect 1) _worsens_ this unless paired with a warning — so the two ship together or not at
all.

Rule: the `flex`/`grid` **display literals are reserved** — the pipeline is their only legitimate
emitter (it prepends `cn(layout, …)`). Any `layout`-kind token found in the _input_ is an authoring
mistake → `console.warn` (throw under `strict: 'throw'`): "layout class `grid` found in resolved
classes; display mode is controlled by the `flex`/`grid` props." The classifier already tags these,
so detection is cheap.

**Stripping is resemblance-based — accepted break point (decided).** Stripping keys on prefix
regexes in `dependency-rules.ts` (`/^grid-/`, `/^col-/`, `/^row-/`, `/^flex-/`, …): a class is
removed because its _name matches a Tailwind grid/flex prefix_, not because it's verified to be a
real Tailwind utility. So `<Box flex className="grid-triplets-1" />` strips `grid-triplets-1` even
though it isn't a valid Tailwind class — it resembles one. **This is the intended contract and the
accepted break point.** The plugin will not resolve against the Tailwind config or tighten patterns
to verify validity; resemblance is the rule. The only obligation is to document it: custom classes
named after Tailwind grid/flex prefixes will be stripped under a conflicting layout mode, so don't
name them that way.

**Diagnostics.** The signal must distinguish _where_ a stripped class came from — stripping is
correct housekeeping for an inline class but a contract failure for a variant. Two cases, opposite
treatment:

- **Case A — consumer `className` stripped** (`<Box flex className="grid-cols-2" />`): the inline
  class is incompatible with the active mode and is removed. **This is correct and stays silent** —
  an ad-hoc call-site class cleaned up by the pipeline. No warning required (optional at most).
- **Case B — a variant's _entire_ contribution stripped** (`<Box flex cols="2" />`, `cols="2"` →
  only `grid-cols-2`, fully removed in flex mode): the variant is an exposed prop that produces
  **nothing** in this mode — dead code. **Warn or throw.** The author published the API; the
  consumer activated it expecting an effect; silence is the wrong outcome.

The valuable signal is therefore narrow and low-noise: **an active variant whose full class
contribution is erased under the resolved mode**, not "any stripped token." Computing it needs
per-variant provenance.

**Where attribution is lost (traced).** Two stages, and the data crosses a flattening boundary
between them:

- _Stage 1 — variants → classes_ (`@praxis-ui/styling`): `createClassPipeline` →
  `VariantClassResolver.#compute` → `cva()` (wrapping `class-variance-authority`). CVA iterates the
  active variants and **concatenates every value's class string into one flat string** internally;
  `resolveClasses` then `cn()`s static + variant + `className`. The per-variant origin is gone the
  moment CVA returns.
- _Stage 2 — stripping_ (`@praxis-ui/tailwind`): `createTailwindPipeline.pipeline` receives only
  that flat string, splits/classifies/filters tokens. It can see _that_ `grid-cols-2` was stripped,
  never _that it was the `cols` variant's sole output_.

So the hook point is the **variant resolver**, because `cva()` is the black box that flattens.
Detecting dead variants requires capturing per-variant contributions at Stage 1 and carrying them to
Stage 2. Two routes:

- **Plugin-side reconstruction** — the plugin closes over `options` (variants/compounds/presets/
  defaults) and receives `props` + `variantKey`, so it can re-resolve each active variant's class
  string (`variants.cols['2']` → `grid-cols-2`) and check for total erasure. No core change, but it
  duplicates CVA resolution and can't cleanly attribute compound-variant / preset-merge classes to a
  single dimension (accurate for simple per-dimension variants, which is most).
- **Core provenance (exact)** — have `VariantClassResolver` resolve per-dimension and emit a
  `{ variantKey: classes[] }` map alongside the flat string, then widen the `ClassPlugin.pipeline`
  signature to receive it. CVA doesn't expose attribution, so this means resolving variants
  per-dimension rather than in one `cva()` call. Larger; touches `@praxis-ui/styling` + the plugin
  interface.

Tier 1 (reserved literals) ships with the `none`-mode change. Case A stays silent by design. Case B
— the originating `grid2` / `<Box flex cols="2">` scenario — is the real target and the only one
that closes the silent-variant-strip hole; it depends on the provenance decision above and is the
gating work, not a non-goal.

The reserved-literal warning ships with this item. The variant-dead-code detection (Case B) is the
originating concern and ships only once the provenance approach is chosen (plugin-side
reconstruction vs. core provenance map) — it is the gating work, tracked here, not deferred away.

Phase 1 (shipped, branch `fix/tailwind-layout-mode-contract`):

- [x] `resolveLayout` → `'flex' | 'grid' | 'none'`; removed the `return raw` short-circuit
- [x] `LayoutState` takes explicit mode; dropped `hasFlex`/`hasGrid` token-inference (+ tests)
- [x] Documented the resemblance-based stripping break point (prefix match → stripped, validity not
      checked) in `dependency-rules.ts`
- [x] Reserved `flex`/`grid` display literals → dev `console.warn` (NOT yet gated on `strict` — the
      plugin's `pipeline()` has no `strict`; threading it in is a follow-up)
- [x] Case A (consumer `className` stripped) stays silent — correct behavior, covered by tests
- [x] Documented the BREAKING change + break point in CHANGELOG
- [x] Unit coverage for `none` stripping + reserved literals

Phase 2 (shipped, PR #86 — `feat/tailwind-dead-variant-detection`):

- [x] Case B (variant's full contribution erased → dead variant): dev `console.warn` naming the
      variant. Provenance approach chosen: **plugin-side reconstruction** — the plugin rebuilds each
      active variant's classes from `options.variants` + props/preset/`defaultVariants` and checks
      total erasure. No core change. Limitation: compound variants not attributed (documented).
- [x] Decided provenance approach (plugin-side reconstruction over core provenance map)

False-positive guard (shipped in Phase 2): dead-variant analysis skips any dimension that
participates in a compound variant — a compound may rescue the per-dimension contribution, so a
naive "all stripped" check would false-positive. Conservative (may miss a genuinely dead variant
sharing a dimension with an unrelated compound), but false-negatives are far less harmful than a
wrong warning.

Still open (future):

- [ ] Gate the reserved-literal + dead-variant warnings on `strict` (requires threading `strict`
      into the plugin's `pipeline()`); currently dev-gated `console.warn`
- [ ] Compound-variant **attribution** (vs. the current skip) — needs the core provenance map; only
      worth it if compound variants become common enough that skipping misses real dead variants
- [ ] Dev-perf: `warnDeadVariants` re-classifies variant class strings, separate from the main
      pipeline's tokenization of `raw`. Dev-only (gated on `NODE_ENV`), so zero prod cost; if it
      adds up across thousands of dev components, add `classifier.classifyMany` + a token cache
- [ ] Structure: `classifier`/`evaluator`/`builder` are stateless module singletons. Fine today;
      revisit pipeline-scoped instances if caching, custom rules, or plugin registration arrive
- [x] Dev-gate the `flex && grid` warning so the string drops from prod bundles (done; the
      precedence behavior still runs universally — only the `console.warn` is dev-only)
- [ ] Expose a non-generic `VariantDefinitions` shape on core's `ClassPipelineOptions` so the plugin
      reads `options.variants` with no cast. The casts are now localized to `hasVariants` /
      `getCompoundVariants`, but the clean long-term fix is core typing the variant surface (the
      plugin isn't unsafe — it just knows more about the shape than the type currently says)
- [ ] Update the Box example doc comments (deferred — file moves in PR #84)

---

## P3 — applyFilter Fast Path

`applyFilter` runs on every render for every component. The current shape calls a composed
`FilterPredicate` closure once per prop key. For the common case (no user `filterProps`, variant
keys only), this is one extra call per key per render.

A specialized path would require reshaping the API — `composeFilter` currently builds a new closure
per component that captures `ownedKeys`, so an identity-check sentinel like
`filterProps === defaultFilterProps` will never fire. The options are:

- Pass a `null` sentinel for "no user filter" and dispatch inside `applyFilter` directly on
  `variantKeys.has(key) || ownedKeys.has(key)`, eliminating the function call overhead
- Or move `ownedKeys` into `applyFilter` directly for the default path

Both reshape the API. Not worth doing before benchmark data shows `applyFilter` is measurably hot on
a realistic component tree (Button, Box, Stack, Grid, Text, Heading all rendering).

- [ ] Benchmark applyFilter on a large component tree
- [ ] Prototype API reshape if profiling shows measurable cost
- [ ] Measure before/after on representative workload

---

## P3 — Analysis Worker

**Not doing at this time.**

The `queueMicrotask` deferral in `StrictBase.warn()` was reverted (PR #78) — it made synchronous
test assertions impossible without `await Promise.resolve()` across every test site. `warn()` is now
synchronous. The deferral premise no longer applies.

A full worker requires serializable rule descriptors instead of predicate functions. That is a
breaking API change with no committed timeline.

- [x] Research worker messaging model
- [x] Prototype diagnostics worker
- [x] Measure serialization overhead

---

## P3 — Parallel Build Workers

**Not doing at this time.**

Vite's own worker pool already parallelizes module-level transforms. A second layer adds
coordination overhead with no measured bottleneck to justify it. `tsc` is the dominant build cost
and requires project-references restructuring to parallelize further.

- [x] Profile build bottlenecks
- [x] Evaluate worker pools
- [x] Benchmark multi-core scaling

---

## P2 — Praxis UI vs. Vanilla React Overhead Benchmark

### Goal

Quantify the runtime overhead a Praxis UI component adds over an equivalent hand-rolled React tab
component — both in bundle bytes and in render time.

### Motivation

Users integrating Praxis UI reasonably want to know what they are paying for. A concrete benchmark
makes that cost visible and gives the project a regression target: overhead should not grow without
a corresponding feature justification.

### Approach

- Implement a functionally equivalent Tabs component in plain React (no praxis-ui) as the baseline —
  same ARIA wiring, same state shape, no extra dependencies.
- Compare against the existing `examples/react` Tabs compound component.
- Measure: initial render time, re-render time on tab switch, hydration time, gzipped JS bytes for
  each variant.
- Run via `lib/bench` under Vitest bench so results are reproducible in CI.

### Success Criteria

- Overhead is documented and stable across releases.
- Any regression in render time or bundle size triggers a benchmark failure in CI.

---

## Explicitly Deferred

These are currently not expected to justify their complexity.

- [ ] Exotic tree structures
- [ ] Binary search refactors
- [ ] Map → custom structures
- [ ] Set → array rewrites
- [ ] Loop micro-optimizations

---

## Shipped — Metrics Dashboard (`@praxis-ui/metrics`)

New private package (`packages/metrics/`) that collects, snapshots, and reports repository health
metrics. Three data sources, three scripts:

**`pnpm collect`** — writes `snapshots/metrics.json`:

- **Bundles** — gzip sizes per tree-shaking scenario, sourced from
  `packages/tree-shaking-tests/snapshots/gzip.json`, sorted descending
- **Architecture** — dependency graph status + violation count (from
  `.repo-state/dependency-graph.json`) and public API export counts per package, split values vs
  types (from `.repo-state/exports.json`)
- **Complexity** — files, named functions, and non-blank non-comment LOC per source package
  (`lib/` + `packages/core`), via ts-morph AST

**`pnpm report`** — prints a formatted terminal dashboard from the snapshot.

**`pnpm assert`** — CI regression gate:

- Hard gate: architecture violations must be zero (exits 1 if not)
- Soft gate: warns if any package's public API export count grew vs `HEAD~1`
- Soft gate: warns if any package's LOC grew ≥ 20% vs `HEAD~1`
- Bundle regression is already gated by `packages/tree-shaking-tests`

**`pnpm metrics`** — collect + report in one step.

CI runs `collect && assert` as part of the structural analysis job; `fetch-depth: 2` ensures
`HEAD~1` is available for the growth comparison.

### Implementation notes

- Single `ts-morph Project` for all packages — AST parsed once, source files routed to their bucket
  by path prefix. Previously five separate `Project` instances.
- Single `forEachDescendant` switch per file instead of four `getDescendantsOfKind` calls, reducing
  AST traversal from O(4A) to O(A).
- LOC scan uses a character-walk loop — no `split('\n')`, no per-line string or array allocation.
- Report pipeline builds one `string[]`, joins once — no intermediate concatenation.

### Snapshot as of 2026-05-30

**Complexity:**

| Package       | Files | Functions |   LOC |
| ------------- | ----: | --------: | ----: |
| primitive     |    16 |        16 |   151 |
| styling       |    15 |        12 |   373 |
| adapter-utils |     7 |         8 |    95 |
| contract      |    23 |        54 | 1,078 |
| core          |    43 |        21 | 1,961 |
| **total**     |   104 |       111 | 3,658 |

**Architecture:** ✓ CLEAN — 0 violations

| Package                  | Exports | Values | Types |
| ------------------------ | ------: | -----: | ----: |
| @polymorphic-ui/core     |      86 |     20 |    66 |
| @polymorphic-ui/tailwind |      16 |      6 |    10 |
| @polymorphic-ui/vue      |       7 |      2 |     5 |
| @polymorphic-ui/react    |       2 |      2 |     0 |

**Bundles:**

| Scenario               |   gzip |
| ---------------------- | -----: |
| full-runtime           | 7,907B |
| vue-minimal            | 6,859B |
| contracts-only         | 6,815B |
| solid-minimal          | 6,328B |
| aria-only              | 5,383B |
| polymorphic-validation | 4,658B |
| minimal-polymorphic    | 3,161B |
| primitive-direct       |   830B |

### Tasks

- [x] Bundle size tracking
- [x] Architecture / dependency graph gate
- [x] Public API surface tracking
- [x] Complexity tracking (files, functions, LOC)
- [x] CI integration with regression gates
- [x] Per-adapter bundle scenarios — react-minimal, preact-minimal, svelte-minimal added alongside
      vue-minimal and solid-minimal; isolation assertions + gzip baselines recorded (PR #82)
- [ ] Cyclomatic / cognitive complexity — deferred; LOC + architecture gate already enforce the
      right constraints at this codebase size; revisit if the contract engine grows significantly
- [ ] Runtime benchmark results in dashboard — deferred; CI timing is too noisy for a useful
      regression gate without baseline averaging infrastructure
- [ ] Build benchmark results in dashboard — deferred; build time is not a pain point; noisier than
      runtime benchmarks

---

## Shipped — Adapter SDK (`@praxis-ui/adapter-utils`)

Shared type infrastructure, a conformance test suite, and a set of correctness fixes to the
adapter-utils primitives. Also: `packages/metrics` and `packages/tree-shaking-tests` moved to `lib/`
(private internal tooling belongs in `lib/`, not `packages/`).

### Shared types

New exports on the root entry:

- `TypedRuntime<G>` — canonical definition, previously duplicated in all five adapter packages
- `BaseBuiltRuntime<G, TOptions>` — the common return-shape contract every adapter's `BuiltRuntime`
  must satisfy; `Simplify<>` applied so IDE hover shows a plain object not an intersection chain
- `RuntimeEngines` — explicit return type for `buildEngines`, stable contract for adapter authors

`type-fest` added as a dependency.

### Conformance suite (`@praxis-ui/adapter-utils/testing`)

`conformanceSuite(adapter)` — a framework-neutral test factory. Pass a `ConformanceAdapter`
implementation to get full behavioral coverage for free. Wired into React (current), Preact, and
Vue. Solid and Svelte have incompatible asChild patterns and are not wired (see Planned).

**Covered contracts (30+ tests):**

| Group            | Contracts                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| displayName      | set from name option; defaults to PolymorphicComponent                                                              |
| tag rendering    | default div; `as` prop override; `tag` option                                                                       |
| class merging    | base class; caller class merged with base                                                                           |
| style forwarding | inline style object applied                                                                                         |
| prop forwarding  | extra attrs forwarded; variant keys stripped; custom `filterProps`                                                  |
| ARIA forwarding  | `aria-label`; `aria-describedby`; non-redundant `role`                                                              |
| event forwarding | `onClick`; `onFocus`; `onBlur`                                                                                      |
| ref forwarding   | to DOM element; with `as` override; through `asChild` to inner element                                              |
| children         | renders child elements                                                                                              |
| asChild          | tag replacement; class merge; zero children; multiple children; `as`+`asChild` mutual exclusion; nested composition |
| variants         | default; prop-driven; compound (all conditions); no compound (partial conditions); `variantKey` preset activation   |
| enforcement      | min-only; max-only; `strict: throw`; `strict: warn`; `strict: false`                                                |
| reactivity       | variant prop change on rerender; tag change on rerender                                                             |

**`ConformanceAdapter` contract:**

- `createComponent(options)` — create a component from `ConformanceFactoryOptions`
- `render(component, props?, children?)` → `RenderResult` with `element`, `rerender()`, `unmount()`
- `setup()` / `cleanup()` — called in `beforeEach` / `afterEach`
- `createRef?()` — provide to opt into ref-forwarding tests
- `capabilities.asChild?: false` — skip asChild tests (e.g. Solid's render-function pattern)

### adapter-utils correctness fixes

| File                 | Change                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apply-filter`       | Return type was `T` (type lie — filters keys out, can't return `T`); now `AnyRecord`. Internal `as` cast removed. Early-continue style.                 |
| `build-core-runtime` | `ownedKeys` was `ReadonlySet<string> \| undefined`; now always `ReadonlySet<string>` via `EMPTY_SET` sentinel — consumers call `.has()` unconditionally |
| `compose-filter`     | `ownedKeys` parameter no longer optional; `?.has()` → `.has()`                                                                                          |
| `build-engines`      | Explicit `RuntimeEngines` return type; `exactOptionalPropertyTypes`-safe conditional return eliminates intermediate `undefined` variable                |
| `slot-validator`     | `assertSingleChild(0)` now produces `"requires a child"` rather than `"requires exactly one, got 0"` — zero and many are distinct error conditions      |

### Tasks

- [x] `TypedRuntime<G>` and `BaseBuiltRuntime<G, TOptions>` shared types
- [x] `RuntimeEngines` explicit return type
- [x] `conformanceSuite` with 30+ behavioral contracts
- [x] Wire React (current), Preact, Vue
- [x] `RenderResult.rerender()` and `RenderResult.unmount()` for reactivity tests
- [x] Capability flags (`asChild`, optional `createRef`)
- [x] adapter-utils correctness fixes
- [x] Move `packages/metrics` and `packages/tree-shaking-tests` to `lib/`
- [x] Fix test failures: synchronous `warn()`, correct `focusin`/`focusout` dispatch (PR #78)
- [x] Fix `adapter-utils` package exports to point to `src/` so CI typecheck works without a prior
      build

### Planned

**Tier 1 — Next:**

- [x] Fix metrics CI: added Repo State step to workflow; filter violations to error-severity only;
      delete dead compose-filter shims; refresh snapshot baseline (PR #79)
- [x] Wire Solid to suite for non-asChild contracts (tag, class, variants, enforcement, reactivity)
      (PR #80)
- [x] Wire React legacy (React 18 / `forwardRef`) conformance (PR #80)
- [x] Wire Svelte to suite via bundle pattern — `childrenEvaluator` called directly,
      `Polymorphic.svelte` gains event normalization and style serialization (PR #80)

**Tier 2:**

- [ ] Per-suite split: `conformanceEventsSuite`, `conformanceAttributesSuite`,
      `conformanceRefsSuite` carved from the main suite — each adapter opts in independently; defer
      until an external adapter author needs it
- [x] `conformanceA11ySuite` — tabIndex, focusability, focus/blur events, keyboard events
      (onKeyDown/onKeyUp), keyboard activation (role=button + Enter/Space), disabled state,
      interactive ARIA attributes, data attributes (PR #81)
- [x] Adapter capability registry — `capabilities.ssr` and `capabilities.hydration` flags on
      `ConformanceAdapter`; `ssrConformanceSuite` wired to all six adapters; `hydrationParitySuite`
      wired to React and Vue (PR #81)

**Tier 3:**

- [ ] `conformancePerformanceSuite` — class-generation cache, variant cache, preset cache behaviour
- [ ] `conformanceBundleSuite` — import isolation (importing Box does not pull in Button code)

---

## Shipped — `examples/*` workspace + React internal-alias namespacing (PR #84)

`packages/docs` → a dedicated `examples/*` workspace root (third category beside `packages/` and
`lib/`), split per framework: `examples/react` (`@praxis-ui/example-react`) and `examples/vue`
(`@praxis-ui/example-vue`). Holds the atomic example components (Box, Button, ButtonGroup, Landmark,
Link) as tested, CI-gated code.

React internal alias `@/shared` → `@praxis-ui/react/shared`: the bare alias leaked into any consumer
mapping `@praxis-ui/react` to source and would collide across adapters. Namespacing made it globally
unambiguous and inheritable; `tsconfig.paths.json` now maps the public adapter entries, so
consumer/example workspaces pure-inherit (`packages/react`, `packages/vue`, both examples dropped
redundant local `paths` blocks). Box example cleaned (removed the incoherent `grid2` preset + a
no-op `filterProps`).

### Next — compound + runnable examples

The restructure set up the home; the original goal (prove the API on real, stateful components) is
still open:

- [ ] Build compound examples — **Tabs** (the README's flagship), then Accordion / Dialog — as
      contract components + framework context, in `examples/react` (and mirror to `examples/vue`).
      This is the real API stress test: context, state, multi-part children, enforcement.
- [ ] `docs/` prose tree + `docs/examples.md` catalog linking into `examples/*` (the
      earlier-discussed documentation reorganization, deferred when scope shifted to the
      restructure).
- [ ] Runnable shell (Vite dev server per example workspace) — deferred during the restructure;
      revisit once compound examples exist and there's something worth viewing in a browser.

---

## Success Criteria

- Maintain O(n) behavior for common runtime paths
- Push work to build time whenever practical
- Keep production runtime lightweight
- Preserve adapter consistency
- Improve diagnostics without impacting rendering performance

## Appendix — Future Adapter Expansion

### Purpose

Extend Praxis UI beyond its current framework ecosystem while preserving the architecture:

Primitive → Contract → Styling → Core Runtime → Adapter Layer → Framework

Adapter work should prioritize ecosystems where Praxis contracts, validation, accessibility, and
semantic composition provide unique value.

---

### Adapter Priority Levels

| Priority | Meaning                   |
| -------- | ------------------------- |
| A1       | Strategic target          |
| A2       | Valuable expansion        |
| A3       | Research only             |
| A4       | Not currently recommended |

---

### A1 — Lit Adapter

Package:

@praxis-ui/lit

Goal:

Support applications built with Lit and Web Components.

Tasks:

- Adapter architecture design
- Contract → Lit component mapping
- Slot integration
- Accessibility validation
- Benchmark rendering performance

---

### A1 — Web Components Adapter

Package:

@praxis-ui/web

Goal:

Generate framework-independent custom elements.

Benefits:

- No framework dependency
- CMS compatibility
- Long-term platform stability
- Cross-framework interoperability

Tasks:

- Define custom element runtime
- Contract → element mapping
- Slot support
- Styling strategy
- SSR investigation

---

### A2 — Angular Adapter

Package:

@praxis-ui/angular

Goal:

Bring Praxis contracts and validation to Angular applications.

Tasks:

- Adapter feasibility study
- Template AST investigation
- Contract integration design
- Benchmark runtime overhead

---

## A2 — Ember Adapter

Package:

@praxis-ui/ember

Goal:

Support modern Ember/Glimmer applications.

Tasks:

- Glimmer compatibility research
- Adapter architecture design
- Contract validation integration
- Prototype implementation

---

### A1 — Adapter SDK

Package:

@praxis-ui/adapter-sdk

Goal:

Provide a standardized toolkit for building and maintaining Praxis adapters.

Tasks:

- Define adapter interfaces
- Extract shared adapter utilities
- Create adapter conformance tests
- Create adapter benchmark suite
- Document adapter authoring workflow

---

## Long-Term Adapter Vision

### Render Adapters

- React
- Vue
- Svelte
- Solid
- Preact
- Angular
- Ember

### Platform Adapters

- Lit
- Web Components
- Server-rendered HTML

Success Criteria:

- Preserve shared runtime behavior
- Avoid framework-specific contract implementations
- Maintain adapter consistency
- Keep validation and accessibility logic centralized
- Enable future ecosystem expansion with minimal runtime changes

---

## Explicitly Deferred Frameworks

- Polymer
- Knockout
- Backbone
- jQuery UI

---

## A2 — Storybook Integration

Package:

`@praxis-ui/storybook`

Goal:

Provide deep integration with Storybook to expose Praxis contracts, diagnostics, adapter behavior,
and component metadata directly inside component documentation and development workflows.

Unlike traditional Storybook integrations, the focus is not rendering components (already handled by
Storybook framework renderers) but exposing Praxis' contract system as a first-class development and
documentation experience.

### Contract Inspector

Provide a dedicated Storybook panel displaying contract metadata:

- Allowed tags
- Allowed roles
- ARIA requirements
- Child cardinality rules
- Slot definitions
- Variant definitions
- Strict-mode configuration

### Runtime Diagnostics

Expose Praxis validation results directly inside Storybook.

Examples:

- Invalid ARIA usage
- Child contract violations
- Slot misuse
- Invalid variant values
- Unknown presets
- Strict-mode warnings

### Variant Explorer

Automatically generate Storybook controls from Praxis variant definitions.

Benefits:

- Eliminate duplicate Storybook arg definitions
- Keep controls synchronized with contracts
- Improve documentation consistency

### Adapter Conformance Dashboard

Expose adapter health information within Storybook.

Display:

- Conformance status
- Accessibility status
- SSR support
- Hydration support
- Runtime capability flags

### Cross-Framework Rendering Research

Investigate rendering the same Praxis contract across multiple adapters simultaneously.

### Automatic Documentation Generation

Generate Storybook documentation from Praxis contracts.

Potential outputs:

- Props tables
- Variant matrices
- Slot documentation
- Accessibility documentation
- Contract constraints

### Success Criteria

- Zero duplication between Praxis contracts and Storybook metadata
- Automatic variant and contract documentation
- Runtime diagnostics visible during component development
- Adapter conformance visibility
- Improved onboarding and documentation quality

---

## A3 — Histoire Integration Research

Package:

`@praxis-ui/histoire`

Goal:

Evaluate a Vite-native component workbench and documentation experience as an alternative or
complement to Storybook.

### Tasks

- Evaluate Histoire plugin APIs
- Compare addon surface to Storybook
- Benchmark startup and build performance
- Prototype contract documentation integration
- Prototype variant-control generation
- Determine long-term maintenance cost

### Success Criteria

- Clear understanding of tradeoffs versus Storybook
- Feasible contract metadata integration
- Lower operational complexity if adopted

---

## A3 — Visual Conformance Testing

Package:

`@praxis-ui/playwright`

Goal:

Extend the existing conformance ecosystem to validate visual parity across adapters.

### Tasks

- Screenshot baseline generation
- Cross-adapter rendering comparisons
- Hydration visual verification
- Accessibility-state snapshots
- CI integration for visual regressions

### Success Criteria

- Detect adapter rendering divergence automatically
- Catch visual regressions before release
- Complement existing SSR and hydration conformance suites
