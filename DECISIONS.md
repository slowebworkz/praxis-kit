# Decisions

## Open

### `spikes/*` — deferred

`../pk` keeps a `spikes/*` glob for throwaway experiments (currently empty).

Decide later whether disposable spike packages live in-workspace (fast to wire up, but pnpm installs
and typechecks them) or in a separate scratch location outside the workspace globs.

### `qa/*` tooling ownership — deferred

`jscpd`, `ts-morph` (and `@ast-grep/cli`) sit in the root `devDependencies` today, carried over from
`../pk`. They are QA/analysis infrastructure, not root tooling — no root script invokes them. Next
cleanup pass: move the `devDependency` declarations into the `qa/*` packages that actually use them
(each referencing `catalog:`), leaving only version ownership at the root via the catalog. Same
question applies to `jsdom` and `type-fest` once test/config packages exist that import them (both
already pared back: `jsdom` dropped from root, `type-fest` under review).

### `lib/contract` — prop-normalizer false-state model

The eight state-prop normalizers in `contract/src/props/` (`disabledProps`, `expandedProps`,
`pressedProps`, `selectedProps`, `invalidProps`, `loadingProps`, `readonlyProps`, `activeProps`)
are ported from `../pk` on **Model A**: a truthy state injects the `aria-*` / `data-*` pair, a
falsy state emits `{}`, and an explicitly-supplied `aria-*` / `data-*` value is preserved (the
normalizer only fills when the key is `undefined`).

Open question raised in port review: props with a meaningful false state — `aria-expanded`,
`aria-pressed`, `aria-selected` — arguably want **Model B**, where `expanded: false` synthesizes
`aria-expanded="false"` rather than nothing. Model A does not *prevent* the false state (a caller
can still pass `aria-expanded={false}` and it is kept); it just does not *derive* it from the
sugar prop.

Not resolving this now — the consumer that reveals the right answer is `packages/core` / the
factory, which is not ported yet, and the call is likely per-prop (tied to component semantics
the contract layer does not own). `aria-invalid` in particular defaults to `"false"` already, so
emitting it would be redundant. Revisit when core wires the normalizers in; if Model B wins for
some props it lands as a deliberate change with a visible diff in
`props/normalizers.test.ts`, which currently pins Model A across all eight.

### HTML/ARIA contract layer — standards audit before it is authoritative

Pre-1.0 gate, not an adapter blocker. The HTML/ARIA enforcement data in `packages/core` —
`HTML_ARIA_RULES` (the per-tag allowed-role table: `main: []`, `nav: []`, and the special handling
of `h1`–`h6`, `ul`/`ol`/`li`, `a` with/without `href`, `button`, `img`, `input[type]` …),
`ALLOWED_ROLES` / `ALLOWED_INPUT_ROLES`, `STRONG_ROLES`, `IMPLICIT_ROLE_RECORD` — is ported from
`../pk` and carries source comments marking it a partial / heuristic model. It is powerful enough
that a wrong entry makes Praxis *confidently reject valid markup*, so it must be validated
systematically against the current **ARIA in HTML** (W3C) and **HTML-AAM** specs, with dedicated
conformance tests citing the normative source per row, before the HTML/ARIA contract layer is
treated as canonical. The `AriaPolicyEngine` / `createAriaPipeline` architecture does not change —
this is a data-correctness pass. Consolidates the notes previously scattered under the
`packages/core` and `lib/primitive` port writeups. Do not widen any of these tables without the
citation pass + tests.

## Resolved

### `runtime/*` — folded into `lib/*` as `lib/runtime`

`../pk` kept `@praxis-kit/runtime` in its own `runtime/*` workspace glob. Folded into `lib/*`.

Why `lib/` and not `packages/` or its own glob:

- It is `private: true`, bundled into `praxis-kit` (`packages/kit`), never published standalone —
  same profile as every `lib/*` package. `packages/*` in this repo is reserved for the publishable
  surface (and `packages/core`, which is private but is the assembly point `kit` bundles).
- It is one package with no anticipated slim/strict split — the "own glob" option only earned its
  keep if we expected several runtime variants.
- It is a sibling internal building block for the adapter layer (`lib/adapter-utils`, the
  adapters, `plugins/vite`'s compiler), not a public entry point.

It sits *beside* `packages/core`, not behind it — `core` does not import it.

**Only the `.` entry (render-time helpers) is ported. `./compiler` is deferred.** `../pk`'s
compiler (`compileComponent`, the contribution passes, the domain merge algebra) is built on the
pre-rewrite `@praxis-kit/pipeline` — `createPipeline` / `executePipeline` with a **pluggable
`merge` strategy and `plugins`** — which the `lib/pipeline` rewrite replaced with `runPipeline` +
a fixed shallow `mergeContext`. Porting it verbatim is impossible; it needs a rewrite against the
new pipeline model. Its only consumer is `plugins/vite`, so it lands with that plugin.

`../pk`'s `@praxis-kit/pipeline` also exported a node/tree/capability/merge-strategy model
(`NodeId`, `SlotName`, `CapabilityMap`, `MergeStrategy`) that the rewrite dropped and that the
render-helper IRs still use. These now live in `lib/runtime/src/pipeline-compat.ts` — a
runtime-owned home for pieces that were always more "runtime" than "generic pipeline"; nothing
else in the workspace needs them. `Diagnostic` / `MetadataMap` / `Pass` survived the rewrite and
are re-exported straight through.

Deferred to the compiler rewrite (from the port review): the artifact hash domains need precise
definitions before anything relies on them for cache invalidation (`styling = sha256(metadata)`
is too broad — it should key on variants/recipes/precomputed inputs, not `docs`); `precomputed`
merge is single-owner (document or field-merge); `CapabilityMap` should be enforced boolean.
`.`-entry follow-ups: `TreeContext` is type-immutable but its `Map` / arrays are not frozen at
runtime (call it logically-immutable or snapshot); `getActiveProps` precedence (variants over
attributes) wants a doc comment.

### `packages/core` — private; publishable infra defers to `packages/kit`

`packages/core` is `private: true` in `../pk` — it is not published, it is bundled into
`praxis-kit` (`packages/kit`), the single published package. So the `packages/core` port carries
no `.changeset/config.json`, no CI build/test/release job, and no `build` script / tsdown config;
all of that lands with `packages/kit`. Scaffolded like the `lib/*` packages (minimal
`package.json`, `tsconfig` extends base, `defineLibConfig` vitest).

Adaptations: `@praxis-kit/primitive` and `@praxis-kit/styling` are **`dependencies`**, not
`devDependencies` as in `../pk` — `src/utils/index.ts` / `src/styling.ts` / `src/index.ts`
re-export runtime values from both. `configs/typescript.ts`'s ESLint `allowDefaultProject` list
gains `packages/*/vitest.config.ts` (`packages/core` is the first `packages/*` entry).

Per-slice hygiene (from the slice-1 review): the `package.json` `exports` map and `dependencies`
track what the *current* slice actually contains — `./contract` is not in `exports` until
`src/contract.ts` lands, and `@praxis-kit/diagnostics` / `type-fest` (both used only by
`src/html/` onward) are added with the slice that first imports them, not up front. `../pk`'s
`src/global.d.ts` (an ambient `process.env.NODE_ENV` declaration "to avoid `@types/node`") was
dropped — the repo's `tsconfig.base.json` already has `"types": ["node"]`, so `process` is typed
without it.

**Ported in four PRs (#18–#21):** (1) `src/types/` + `src/utils/` + `./primitive` / `./styling`
entries + scaffold; (2) `src/html/` (contracts / spec tables / rule sets — the bulk, ~1780 LOC) +
`src/children/`; (3) `src/options/` + `src/resolver/` + `src/state/` + `src/validator/`; (4)
`src/factory/` (`createPolymorphic` + the memoized render pipelines: tag / props / HTML
prop-normalizers / HTML children-evaluator / class / ARIA), `src/diagnose.ts`, the `./contract`
barrel, and the final `.` barrel. Otherwise ~verbatim from `../pk`.

Adaptations made during the port review, per slice:

- **Slice 2:** `resolveAllowedRoles`'s `byProp` case resolves an *unrecognized* discriminator to
  the policy `fallback` — an unknown `<input type>` is checked against `text`'s allowed roles
  (HTML's own "unknown type behaves as text" rule) instead of being skipped as "not modeled".
  `createMutuallyExclusiveRule` tests HTML-boolean-attribute *presence* (`required=""` /
  `required="required"` count, `required={false}` / absent do not) rather than raw truthiness,
  which missed the string-attribute forms.
- **Slice 3:** `diagnostics.active` → `.warnActive` in `validateFactoryOptions` (the
  `lib/diagnostics` rename; a warning-only validator, so the scope matches). Documented that
  `createResolverPipeline` is a **built-in-rules-only** lightweight path (it takes the minimal
  `ResolverOptions`, no `ariaRules` / `variantKeys`); custom `enforcement.aria` and variant-aware
  validation flow through `createPolymorphic` → `createAriaPipeline`, which threads
  `HTML_ARIA_RULES` + `resolved.ariaRules` + `resolved.variantKeys` into the engine.
  `allowedAs` constrains a caller-supplied `as` override only, not the component's `defaultTag`.
- **Slice 4:** the core/adapter boundary is documented on `createPolymorphic`'s `methods` block.
  `packages/core` resolves the render-time capabilities (`normalizeFn`, `htmlPropNormalizersFn`,
  `htmlChildrenEvaluatorFn`, `childRules`) and exposes them on `runtime.options`; it does **not**
  run a full render. `resolveProps` is a component-level merge only. The DOM-facing prop
  normalization (`htmlPropNormalizersFn` → `normalizeFn`, in that fixed order) and children
  evaluation are applied one layer up by `@praxis-kit/adapter-utils` (`resolveNormalizedProps` /
  `build-engines`), which every adapter calls after `resolveProps` — so the ordering is identical
  across all seven adapters. `resolveAria` is the one enforcement step core runs inline, because
  `AriaPolicyEngine` also mutates props. (`resolveClassPlugin`'s `factory` param is already
  `AnyClassPluginFactory` = `… | undefined`, so its `if (!factory)` guard is honest — no change.)
- Lint: `import-x/consistent-type-specifier-style` and `unicorn/no-useless-undefined` autofixes.

Open follow-ups (`.vscode/MIGRATION.md`): `core/utils` bundles contract state-prop normalizers
under a "utils" name (reconsider when a real consumer forces the grouping); `primitive.ts`
surfaces ARIA-role helpers from `contract/types` despite the filename; the HTML/ARIA role tables
need a standards audit before the contract layer is authoritative (own entry: "HTML/ARIA contract
layer — standards audit before it is authoritative"); the ARIA widget contracts (`menuContract`
etc.) currently enforce accessible naming, not full APG child patterns.

### `adapters/react` — port scope and adaptations

First framework adapter. Ported whole (`src/shared/` + `src/current/` React-19 + `src/legacy/`
React-18 variants, ~2000 src LOC, 33 vitest files / 576 tests, 1 Playwright-CT spec). The adapter
is a thin shell over `@praxis-kit/adapter-utils`: `buildRuntime` wires `buildCoreRuntime` +
`buildEngines` + `composeFilter` + `SlotValidator`; `shared/render.ts` is the React render
pipeline calling `resolveNormalizedProps` / `applyFilter` (the canonical order confirmed at the
`packages/core` slice-4 checkpoint — verified here, nothing missing). `current/` and `legacy/`
differ only in ref handling (React 19 plain-prop ref vs React 18 `forwardRef`) and their `Slot` /
`normalize-children` copies.

- **`exports`:** `.` (React 19) + `./legacy` (React 18). Both mapped in `tsconfig.paths.json`.
- **deps:** `type-fest` + the six workspace `@praxis-kit/*` it imports move to `dependencies`
  (`../pk` had all the praxis deps in `devDependencies`); `react` stays a `>=18` peer; `clsx` was
  listed but unused — dropped. `@praxis-kit/playwright` is a devDep (CT spec only).
- **No per-package `eslint.config.ts`** — the new repo lints from the root config only, and
  `configs/architecture.ts` already declares the `adapters/react` boundary element. `../pk`'s
  per-adapter `no-restricted-imports` (block importing sibling adapters) is a root-config
  follow-up for when more than one adapter exists.
- **Dangling `@praxis-kit/*` eslint-disable directives** (3, for the not-yet-ported
  `no-enforcement-without-strict` rule) rewritten as plain intent comments; re-add the directives
  with `plugins/eslint`.
- `@praxis-kit/shared/tests` (a `../pk` path alias to `lib/primitive/src/tests`) → imported
  directly as `@praxis-kit/primitive/tests` (one hydration-parity test).
- `defineJsdomConfig` reintroduced in `configs/vitest.base.ts` — see the Vitest entry.
- `.pw.spec.tsx` runs under `test:pw` (Playwright-CT) only; not wired into CI here (no browser
  install / CT job yet — follow-up with the first CI workflow).

**Review — `onElement` lifecycle:** legacy `create-contract-component.ts` was missing the
"clear `cleanupRef` before re-invoking `onElement`" step that `current/` has (so a throwing
registration on a replacement element could leave the prior, already-run cleanup to fire again on
unmount) — aligned. Both `on-element.spike.test.tsx` files gained a lifecycle matrix: replacement
runs the old cleanup before the new registration, cleanup runs exactly once on unmount, a
`void`-returning `onElement` is tolerated, a throwing `onElement` leaves no stale cleanup (+8
tests, 586 total).

**Review (P1) — `warnDiscardedChildren` baseline:** the `asChild` discard check compared the *raw*
`children` prop length against the element-only Slot list, so `{cond && <X/>}`, `null`, `false`,
and whitespace-only strings (which React arrays but never renders) counted as "discarded" and
produced spurious warnings. Fixed to compare the *normalized* child list (elements + non-empty
text/number) against the Slot list — the difference is exactly the text/number siblings Slot
genuinely drops; a zero-element list is left to `assertSingleChild`. Text siblings in `asChild`
mode are still warn-and-dropped (not preserved) — there is no element for Slot to render them
into, and the warning is a real diagnostic, not silent loss. +3 `render.test.ts` cases (real
discard, falsy-conditional no-warn, bare-text → `assertSingleChild`). **Follow-up:** mirror the
edge cases in `interaction.pw.spec.tsx` once the CT job runs in CI.

### `lib/styling` — dropped the `variant-pass` "proof path"

`../pk/lib/styling/src/variant-pass/` carried three demo passes (`basePass`/`hoverPass`/`focusPass`,
Tailwind literals like `inline-flex` / `hover:bg-blue-500`), a `styleMergeStrategy`, and a
`style-proof.test.ts` that hand-rolled a pipeline loop over them. All three built on the
pre-rewrite `@praxis-kit/pipeline` API (`Pass<TContext>` + a pluggable `MergeStrategy<TContext>`).
The rewritten `lib/pipeline` keeps `Pass` but replaced `MergeStrategy` with a fixed shallow
`mergeContext` (see its own entry), so `styleMergeStrategy` / `style-proof.test.ts` no longer
compile, and nothing outside `lib/styling` ever imported `basePass` / `styleMergeStrategy`.

Dropped the proof path entirely rather than retarget dead demo code. Kept the parts real
consumers use: `createVariantPass` / `VariantConfig` / `CompoundVariant` (from `variant-pass.ts`,
no pipeline dep) and `buildPrecomputedKey` / `compileVariantLookup` (from
`compile-variant-lookup.ts`), which `lib/adapter-utils` consumes. `DefaultMap` (was a shared
`@praxis-kit/pipeline` alias for `StringMap<string>`) is now defined locally in
`compile-variant-lookup.ts` and re-exported — `lib/styling` no longer depends on `lib/pipeline`
at all. `clsx` / `type-fest` also dropped from its deps (unused directly; `cn` from `primitive`
owns `clsx`).

Two consistency fixes from the port review:

- **Recipe semantics unified.** `VariantClassResolver.#compute` gated on `if (!recipe)`, so
  `recipe: ''` was "no recipe" there while `createClassPipeline` / `StaticClassResolver` /
  `diagnoseClassPipeline` (and the cache key) all treat `recipe !== undefined` as active. Now the
  whole package follows one rule: `undefined` is "no recipe", every string is a recipe key.
- **`compileVariantLookup` honors array compound conditions.** `matchesCompound` did an exact
  `!==`, but a `CompoundVariant` condition value can be `readonly string[]` (`size: ['sm','lg']`)
  and `diagnoseClassPipeline` already matches those. The compiled precomputed table now matches
  runtime CVA semantics.

Documented (not changed): the precomputed lookup is the no-recipe path — its keys are variant
props alone, this resolver's are `recipe | props`, so a recipe-active call never hits it. Still
open (P3): the cache-key serializer (`s:` / `x:` prefixes) does not escape delimiters — a
theoretical collision, not reachable with normal CVA string-literal variant values.

### `lib/pipeline-kit` — kept as its own package, not folded into `lib/pipeline`

`../pk` had `@praxis-kit/pipeline-kit` alongside `@praxis-kit/pipeline`; the migration tracker
carried it as "❓ keep? — decide if the new `lib/pipeline` absorbs this".

Kept separate. The two are different abstractions:

- **`lib/pipeline`** (rewritten during its own port) — a data-processing runtime: `Pass` objects,
  `runPipeline`, phased composition, `{ patch, diagnostics, metadata }` accumulation with
  sequential/parallel strategies.
- **`lib/pipeline-kit`** — a bare *callable-function* composition toolkit:
  `Pipeline<TArgs, TOutput> = (...args) => TOutput`, plus `composePipelines` (chain),
  `allPipelines` (tuple, `Promise.all`-shaped), `anyPipeline` (first defined wins), and
  `definePipeline` (a `PipelineFactory` memoized by the resolved-config object identity via a
  `WeakMap`). ~140 LOC, zero `@praxis-kit` deps (only `type-fest`).

`packages/core` imports `definePipeline` / `PipelineFactory` / `Arguments` directly for its
render pipelines. Folding pipeline-kit into `lib/pipeline` would mean reconciling two unrelated
`Pipeline` shapes — a redesign, not a port. Ported verbatim; one lint adaptation (praxis-kit's
`unicorn/no-useless-undefined` turned `return undefined` / `() => undefined` into `return` /
`() => {}`).

### `lib/contract` — `aria-level` value range: `{ min: 1 }`, no maximum

`../pk` typed `aria-level` as `{ kind: 'integer', min: 1, max: 6 }` in `ARIA_VALUE_TYPES`, with an
engine test asserting `aria-level="7"` warns. WAI-ARIA defines `aria-level` as `min 1` with **no
maximum** — `1–6` is only the HTML `h1`–`h6` heading range, and `aria-level` also applies to
`treeitem`, `row`, `listitem`, deeply nested headings, etc. with no cap.

Resolved in slice 3b: the table entry is now `{ kind: 'integer', min: 1 }`. Heading-specific
concerns stay covered — `AriaPolicyEngine.#checkRedundantAriaLevel` still flags an `aria-level`
that merely restates a heading element's implicit level. A hard `1–6` ceiling scoped to
`role="heading"` was considered and **not** added: ARIA itself does not require it, deep-nesting
cases legitimately exceed 6, and no consumer needs it. The ported `aria-level="7"` test is
updated to assert it is now accepted.

### `lib/contract` — `AriaPolicyEngine` orchestrates; new rules live outside it

`aria/aria-policy-engine.ts` is ~840 lines as ported: context derivation, empty-role
normalization, plan cache + key construction, rule selection, `#runRules`, fix sorting/apply,
`report()`, **and** all ~20 built-in rule bodies as private static methods. Coherent today
(every part belongs to one engine), but at the edge of becoming a god object.

Not refactoring the existing file now — the port stays faithful and the rules-as-private-statics
shape is stable. Going forward, though: **a new ARIA semantic rule does not get added as another
`AriaPolicyEngine.#checkX` method.** It goes under `aria/spec/` (the standards-derived data),
`aria/spec/validators/` (shared checking logic, like `checkRequiredAttributes`), or a new
`aria/rules/` module, and the engine's `#pipeline` / `#implicitOnlyRules` arrays just reference
it. The engine orchestrates: derive context → select policy → run rules → collect violations →
apply fixes → return. When several existing rules next need to change together, that is the
moment to extract them outward too.

### `lib/contract` — port scope and review outcomes

Ported from `../pk` in seven PRs (#9–#15), each reviewed on landing, kept as **one package**
(`@praxis-kit/contract`) — the boundary ("the contract runtime: ARIA engine, structural child
rules, `InvariantBase` severity routing, plus the contract-specific diagnostics/types/prop
normalizers every adapter and `packages/core` consume") is coherent. Depends on
`@praxis-kit/{primitive,diagnostics}` and `type-fest`; `primitive` is the single ARIA/child
vocabulary and this package only interprets it.

Slices: `src/types/` → `src/diagnostics/` + `src/props/` → `src/aria/spec/` + policy →
`src/aria/` `AriaPolicyEngine` + tests → `src/strict/` → a focusability/numeric correctness pass
→ `src/children/`.

Changes made during the port (beyond the dedicated entries above for the false-state model,
`aria-level`, and the "engine orchestrates" convention):

- **`types/aria/aria-role.ts`** reduced to a re-export of `primitive`'s `AriaRole` (`../pk`
  redefined it identically). Same "keep `@praxis-kit/contract` a complete surface" reasoning
  keeps the `isInvalid` re-export from `./aria` even though it is a bare `primitive` predicate.
- **`InvariantBase.active` → `warnActive`**, tracking the identical rename in `lib/diagnostics`.
  One consequence: `ChildrenEvaluator.evaluate()`'s cheap early-return gate is now visibly
  Warning-scoped, while child violations are Error severity — a hand-built "report errors, ignore
  warnings" policy would over-skip. Every non-silent `DefaultPolicy` preset reports Warning, so
  it is latent; commented at the call site, tracked in `.vscode/MIGRATION.md`.
- **`polymorphic-validator.ts` → `aria-policy-engine.ts`**, `aria-policy-engine.helpers.ts` →
  `.test-helpers.ts` — the file names now match the class and the `aria-policy-engine.*.test.ts`
  suite; the helper name marks it test-only.
- **`INTERACTIVE_TAGS` → `NATIVE_INTERACTIVE_TAGS`** and its comment no longer claims the members
  are "always keyboard-reachable"; a real **`isPotentiallyFocusable(tag, props)`**
  (`aria/spec/elements/focusable.ts`, prop-aware: `href`, `type="hidden"`, `disabled`,
  `tabindex`, `contenteditable`) replaced the bare tag-set check in `#checkAriaHiddenOnFocusable`.
  Documented as tabbability, not raw focusability (`tabindex="-1"` deliberately excluded).
- **Strict ARIA numeric parsing** — `strictNumeric()` (whole string must be numeric; `""` is not
  `0`) replaced `parseFloat`/`parseInt` in `#isValidAriaValue` and `#checkRedundantAriaLevel`.
- Normative ARIA tables carry `// Source:` provenance lines; `REQUIRED_ARIA_PROPERTIES` and
  `NAME_REQUIRED_ROLES` are marked intentionally partial; `HtmlDiagnostics.input`
  `attributeIgnoredForType` takes a typed `InputIgnoredAttribute` key (no runtime throw);
  `ContractDiagnostics` message grammar normalized to `component:`.
- **Children: the `position="first"|"last"` ⇒ `max=1` invariant moved into `normalizeChildRule`.**
  `../pk` checked it in a `ChildrenEvaluator` helper (`checkPositionCardinalityInvariant`) that
  ran on the static rules only when no dynamic rule existed, and separately on resolved dynamic
  rules — so a contradictory *static* positional rule slipped through whenever the evaluator also
  held a dynamic rule, and `diagnoseChildren` never checked at all. Normalizing is where a
  structurally-impossible rule is a bad rule, so the throw lives there now and both APIs inherit
  it; the evaluator helper is deleted. Regression tests added for the static+dynamic case and for
  `diagnoseChildren` parity.
- Documented in `rules-matcher.ts`: a rule with a unique `type` matches on `child.type` alone —
  its `match` predicate is not called on the fast path (a `match` that needs to narrow further
  must omit `type` or share it).

Open follow-ups (all in `.vscode/MIGRATION.md`): the `warnActive`-scope gate above; a roleless
focusable element (`<div tabindex="0" aria-hidden>`) is skipped because `AriaPolicyEngine.evaluate`
short-circuits on `!hasRole`; the name-required check treats `'aria-label' in props` as
sufficient (`<img aria-label="">` passes) — only matters if `NAME_REQUIRED_ROLES` grows; a
`role="img"` element still needs the missing-`alt` HTML fact handled separately; a typed
`primitive` implicit-role lookup would drop the one `tag as Tag` cast in `getImplicitRole`.

### `lib/primitive` — port scope and review outcomes

Ported ~verbatim from `../pk` (156 src files, 7 export subpaths). Kept as **one package** — the
boundaries ("framework-neutral primitives + semantic machinery for every adapter") are coherent;
splitting into `primitive-core`/`-types`/`-guards`/… waits for real independent consumers.

Changes made during the port review:

- **`WithChildRules`** tightened — `enforcement.children` is `readonly ChildRuleInput[]`, not
  `readonly unknown[]`. Documented as the deliberately-minimal structural upper bound / inference
  wildcard; the real "is children enforcement active" narrowing is downstream
  (`WithChildrenEnforcement`).
- **`wrapMethodForDetection.restore()` bug fixed** — it always `delete`d the property, discarding a
  pre-existing own-property override. Now captures the original descriptor and restores it, falling
  back to `delete` only when there was none.
- **ARIA tables documented as a partial model.** `IMPLICIT_ROLE_RECORD` carries a 4-kind taxonomy
  (static / attribute-dependent / context-dependent / state-dependent) and the rule that only
  *static* roles belong in it. `STRONG_ROLES` is flagged standards-sensitive — a heuristic that
  needs an HTML-AAM / ARIA-in-HTML citation pass and dedicated conformance tests before it is
  canonical; do not widen it without both. Tracked in `.vscode/MIGRATION.md`.
- **`createObservable`** — no per-listener `try/catch` is deliberate (a throwing listener is the
  adapter's bug to surface); documented + tested.
- **Complexity watches** (comments in the code, no change yet): `ResolvedFactoryOptions` — split
  into `Resolved{Rendering,Styling,Enforcement,…}Options` before adding a new concern, not append
  fields; `iterate.ts` — keep to genuinely shared primitives.
- **Root barrel stays broad but subpaths are the direction.** `src/index.ts` re-exports everything;
  `./types`, `./guards/aria`, `./constants/aria`, etc. exist so consumers can express narrow
  intent. Push new consumers to subpaths as the package grows.

### Type organization: `src/types/` folder + barrel is the package default

`../pk` used a `src/types/` folder with grouped files and an `index.ts` barrel in 16 of 17
packages; a single `src/types.ts` was one exception (`lib/diagnostics`, 47 lines). This repo
standardizes on the folder everywhere — mixed conventions across ~26 packages cost more than one
directory, and the folder scales without churn (a new type is a new file, not a growing monolith).

Two carve-outs:

1. **Co-locate a type with its behavior module when it has one.** `Severity` lives in
   `severity.ts`, `DiagnosticPolicy` in `policy.ts`, `DiagnosticCode` in `codes.ts`. `types/` holds
   only pure-data shapes with no natural home module — wire/descriptor types.
2. **A lone `types.ts` is acceptable only for a genuinely tiny package** — one cohesive group, no
   growth path. Promote to `types/` at the first second group.

`lib/pipeline` already conforms. `lib/diagnostics` was promoted from `types.ts` to
`types/{diagnostic,reporter}.ts` + barrel as part of its port.

### `lib/diagnostics` — API changes made during the port

Reviewed the ported surface and changed it rather than freezing `../pk`'s shape:

- **The policy owns enforcement; reporters only report.** `Diagnostics.report` checks the policy
  first — `Ignore` drops, `Throw` raises a `PraxisError` inline, only `Report` reaches the
  reporter. `ThrowingReporter` was **removed** (dead — a reporter never got the chance to throw).
  "Strict mode" is a policy with `throwThreshold: Severity.Error`, not a reporter.
- **Facade covers all five severities**: `debug` / `info` / `warn` / `error` / `fatal`. `../pk` had
  only `warn`/`error`/`info` despite `Severity.Debug`/`Fatal` existing.
- **`active` → `warnActive`.** It only ever meant "a `Warning` would not be ignored" — a cheap gate
  for skipping warning-level validation work, not a general "diagnostics on" flag. Renamed so the
  name matches the semantics.
- **`DefaultPolicy` validates `throwThreshold >= reportThreshold`** (`RangeError` otherwise) — a
  throw band below the report band is always a misconfiguration.
- **`AsyncConsoleReporter` dedups on the formatted string**, deliberately — it is a console-UX
  helper, not a lossless channel. Documented on the class; `CollectingReporter` is the lossless
  option. A location-aware key stays a future option.
- **Dropped the `type-fest` dependency** — `DiagnosticInput` uses built-in `Omit<Diagnostic,
  'severity'>` instead of `Except`. No other repo code used `type-fest`.
- **`AnyRecord` is imported from `@praxis-kit/primitive`.** `primitive` is the single source of
  truth for `AnyRecord`/`StringMap`; `primitive` also imports the `Diagnostics` type from here, so
  this forms a package cycle — but a **type-only** one, fully erased at build time, so it is
  accepted rather than duplicating the primitives. `@praxis-kit/primitive: workspace:*` is a
  declared dependency of `lib/diagnostics`. **On the architectural watch list** (port review):
  accepted now because the alternative — a premature `@praxis-kit/types` / `@praxis-kit/shared`
  leaf — is worse. If such a genuinely independent leaf package ever exists for its own reasons,
  `primitive ↔ diagnostics` is the first cycle to move into it.

### `lib/diagnostics` — `Diagnostic.context` vs `.metadata`

Both are `Record<string, unknown>` bags today, and left to drift they become the same thing. The
intended split, documented on the types in `types.ts`:

- **`context`** — data a *reader* needs to understand the diagnostic; the values a formatter
  interpolates into `rationale`/`message` (offending prop name, expected vs actual child, ARIA
  token). Human-oriented.
- **`metadata`** — data a *consumer* keys off (build plugin, editor integration, telemetry); never
  rendered to a person. Machine-oriented.

Direction (from the README): grow structured `context` fields so formatters derive messages
instead of callers pre-formatting them — but **add no field to either bag without a concrete
consumer**.

### `lib/diagnostics` — `HTML`/`ARIA` are spec validity; `Accessibility` is guidance

The `DiagnosticCategory` taxonomy keeps a deliberate split, mirrored by the code ranges in
`codes.ts`:

- **`HTML` (`HTML3xxx`) / `ARIA` (`ARIA2xxx`)** — spec compliance. The markup or ARIA usage is
  *invalid* per the HTML standard or the ARIA spec. A fact.
- **`Accessibility` (`A11Y8xxx`)** — best-practice guidance. The usage is spec-valid but
  inadvisable. Advisory.

A rule goes in `Accessibility` **only when it is not** an `HTML`/`ARIA` validity fact. This lets
consumers treat the two classes differently (e.g. fail a build on validity errors, only warn on
guidance). Documented on the enum itself in `category.ts`; do not let new codes blur the line.

**APG authoring practices are guidance, not validity** (port-review guardrail). Praxis must not
progressively enforce every WAI-ARIA APG recommendation as if it were a platform violation. The
line: an APG "should" (unique landmark names, `menu` inside a `menubar`, roving-tabindex order,
APG child-composition patterns) is `Accessibility` / `warning` at most — never `HTML`/`ARIA` /
`error`. Only a genuine HTML-spec or ARIA-spec invalidity is `HTML`/`ARIA`. `requireAccessibleName`
(`packages/core` widget contracts + the `nav`/`aside` landmark rule) is deliberately `warning`
severity for exactly this reason; keep it and any similar check scoped that way. The
role-table standards audit (own entry) is the companion task — get the validity facts right, and
keep everything else advisory.

### Type assertions (`as` / `as unknown as`) — fine at boundaries, suspicious in enforcement logic

Port-review guardrail. The codebase carries ~20 `as` / `as unknown as` casts. The rule for
keeping that number honest:

- **Acceptable** — a cast at a framework or type-system boundary: the `createPolymorphic` /
  `createContractComponent` return (`assembled as MergeRecords<…>` — a conditional type TS can't
  prove while generics are open, guarded by a runtime `invariant`), React ref shapes
  (`Ref<T> | null` narrowing), `ElementForTag<…>` on the DOM ref API, adapter `FactoryOptions`
  guards. These sit where the type system genuinely can't follow and a runtime check or a
  well-understood invariant backs them. Each should carry a one-line comment saying which.
- **Suspicious** — a cast inside semantic enforcement logic (contract evaluation, ARIA rule
  results, diagnostic construction, children matching). There the types *are* the specification;
  a cast is usually a modelling gap to fix, not paper over.

New casts on the "acceptable" side need the boundary comment; new casts on the "suspicious" side
need a reviewer's sign-off or a follow-up to remove them.

### Versioning: `0.x` until usable, then `v1.0.0`

Every package stays on `0.y.z` until `@praxis-kit/kit` can be installed and used to build a real
component with contract enforcement working through at least one framework adapter and the
standalone runtime. That milestone is `v1.0.0` — the first git tag, cut on `main`.

- Pre-1.0, breaking changes are expected and do not force a major; Changesets moves `0.y.z`.
- The old repo's version numbers are **not** carried over (`../pk` had drifted to root `4.0.0` and
  `@praxis-kit/kit` `7.8.1` with no changeset config). This repo starts at `0.0.0` and Changesets
  owns every bump from the first publishable package.
- No `v0.x` tags unless a real pre-release is cut; no version badge in `README.md` before `v1.0.0`.

Migration status and the full "where version numbers live" checklist are tracked in
`.vscode/MIGRATION.md` (uncommitted).

### `lib/pipeline` — execution strategy is per-pipeline; parallel conflicts throw

`Pipeline.strategy` is `'sequential'` (default when omitted) or `'parallel'`, set on each pipeline
so a tree can mix them. `runPipeline` reduces every node — `Pass` or nested `Pipeline` — to the
same `{ patch, diagnostics, metadata }` outcome, then folds those outcomes per strategy:

- **sequential** — a barrier between nodes; each node sees the previous node's merged context.
- **parallel** — every node runs against the same input (`Promise.all`); patches are checked with
  `detectConflicts` and merged. Diagnostics and metadata still accumulate in node order so the
  result is deterministic.

**A parallel key conflict throws `ParallelConflictError`, it is not a diagnostic.** Two concurrent
nodes writing the same key with no ordering between them is a pipeline *authoring* bug — there is
no correct merged value to pick. Diagnostics are for invalid *input*, not invalid pipelines. Fail
fast, name the pipeline and the keys.

A nested pipeline running as a parallel node contributes `shallowDiff(input, itsResult)` — it saw
the same input a sibling pass saw, and `mergeContext` keeps untouched keys by reference, so the
diff is exact for untouched keys and conservative (flags a change) for a key reassigned to an
equal-but-new value.

Still deliberately **not** built: a synchronous fast path for all-sync pipelines, and any
`concurrency` limit on `parallel` (all nodes fire at once).

### `lib/pipeline` — phases are composition sugar, not an execution mode

`phasedPipeline(name, phases)` builds a plain `Pipeline` whose top-level nodes are the canonical
phases — `normalize`, `enrich`, `validate`, `emit` (`PIPELINE_PHASES`, always that order) — as
nested sub-pipelines, one per non-empty phase. It runs through `runPipeline` with zero special
casing.

- **No new runtime.** A phase is a nested `Pipeline` named after the phase; the executor already
  handles nesting. The only thing `phasedPipeline` adds is the fixed order and the phase names.
- **Empty phases are dropped**, not run as empty sub-pipelines, so the tree reflects the work that
  exists.
- **The names carry no semantics here.** `validate` is not wired to fail-on-diagnostic; `emit` is
  not special. The pipeline package assigns meaning only to *order*. Consumers (the compiler, the
  runtime) attach the behaviour.
- Naming each phase sub-pipeline means a `RunResult`'s diagnostics and any tree-walking tooling can
  attribute work to a phase without a separate phase concept in the executor.

### `lib/pipeline` — sequential executor is `runPipeline`, always async, returning `RunResult`

`runPipeline(pipeline, input)` walks `pipeline.nodes` in order with a barrier between each: a leaf
`Pass` is `execute`d and its patch folded in via `mergeContext`; a nested `Pipeline` runs in place
and its whole outcome is folded into the parent's accumulation.

- **`RunResult` is not `PassResult`.** `PassResult` is a *patch* one pass proposes
  (`context?: Partial<TContext>`); `RunResult` is the fully accumulated state the executor owns —
  final `context: TContext`, and the concrete `diagnostics` / `metadata` collected across the run.
  A pass never sees a `RunResult`. This is the "execution result vs accumulated context" boundary.
- **Always returns a `Promise`.** A node may be an async pass (`MaybePromise`), so the executor
  awaits every node. A synchronous fast path for all-sync runtime pipelines is a later performance
  concern — not built until benchmarks justify it.
- **Diagnostics concatenate** in run order. **Metadata shallow-merges** in run order (last key
  wins); passes that must not collide namespace their keys. Metadata is never merged into
  `context`.
- Nesting is structural: a node is a `Pipeline` when it has `nodes`, else a `Pass`. No base class,
  no `kind` tag.

### `lib/pipeline` — context merge is shallow top-level replace

`mergeContext(accumulated, patch)` is `{ ...accumulated, ...patch }`: each key present on a
`PassResult.context` patch replaces that key's value wholesale; absent keys are untouched. No deep
or per-domain merge.

Why:

- It is the honest match for `PassResult.context`'s `Partial<TContext>` type — a shallow patch,
  merged shallowly. Deep merge would make the type and the runtime disagree.
- Order-independent under one stateable rule: two passes in the same parallel group must not write
  the same key. `detectConflicts` enforces that for the future parallel executor. Deep merge has no
  such rule — write order silently changes the result.
- `diagnostics` and `metadata` live outside `context` and accumulate separately, which absorbs most
  of the "different domains need different merge semantics" pressure.
- Smallest thing that unblocks `Pipeline`. When a concrete in-`context` domain needs concat or
  recursive merge, a strategy map can be added with shallow replace as the default — backward
  compatible.

Invariant carried forward: a `Pass` never owns the pipeline's context. It produces a patch; the
executor owns accumulation. `Pass` → `PassResult` → { context patch → `mergeContext` → accumulated
context; diagnostics → accumulation; metadata → tooling, never merged into context }.

### Vitest: root `vitest.config.ts` with `test.projects` (not `vitest.workspace.ts`)

Vitest 4 deprecates the standalone `vitest.workspace.ts` that `../pk` uses. `vitest.config.ts` at
the root declares a `test.projects` glob over
`{lib,packages,adapters,plugins,tooling,qa,examples}/*/vitest.config.ts`; each package owns its own
config. `configs/vitest.base.ts` (shared `defineLibConfig(name, overrides?)`) is ported too, as of
the first package (`lib/pipeline`) — collapsed to one function with `environment` etc. passed
through `overrides`; `include` is enforced last as policy (`src/**/*.{test,spec}.ts`).

`../pk`'s second factory, **`defineJsdomConfig`, came back with `adapters/react`** — a framework
adapter genuinely can't be expressed through `defineLibConfig` overrides: it needs
`environment: 'jsdom'` *and* an include policy of `src/**/*.test.{ts,tsx}` (test files sit beside
`.tsx` source, and `.pw.spec.tsx` must be left for the Playwright-CT runner, not picked up by
Vitest). Both are enforced last, same as `defineLibConfig`; `overrides` carries only `setupFiles`
etc. Every framework adapter uses it.

### ESLint: ported from `../pk`, minus the in-repo plugin

`eslint.config.ts` + `configs/{base,typescript,architecture,imports,unicorn,types}.ts` are ported.
Two pieces are left out until the packages they need exist:

- the `@praxis-kit` ESLint plugin import and the self-validation block that runs its rules over
  `packages|adapters|examples/*/src` — needs `plugins/eslint`.
- `configs/praxis-plugin.ts`.

`configs/architecture.ts`'s `boundaries/elements` patterns are copied verbatim; they match nothing
(and so enforce nothing) until those package dirs land.

### Git workflow: `main` stable, `develop` integration

`main` holds only stable, released state. `develop` is the integration branch — feature branches
start from `develop` and merge back into it; `develop` merges into `main` at a release.
`.vscode/tasks.json` carries the workflow helpers — `Git: sync repository` fetches and hard-resets
**both** `main` and `develop` to their origins then prunes gone branches; `Git: switch develop` and
the individual `Git: reset … to origin` / `Git: prune gone branches` tasks are also exposed. The
file is re-included in `.gitignore` past the global `.vscode` exclusion so the workflow travels with
the repo. A `Git: start feature` task is deferred — the branch name needs input, so it is handled
outside a plain shell task for now.

### Bundler: tsdown (not tsup)

`../pk` catalogs both `tsup` and `tsdown`. This repo standardises on **tsdown** for package builds;
`tsup` is removed from the catalog. Revisit only if a concrete blocker surfaces.

### Release flow: Changesets

`@changesets/cli` is in the foundation commit (catalog + root `devDependencies`, `changeset` /
`version` / `release` scripts). A `.changeset/config.json` and the CI release job land with the
first publishable package.
