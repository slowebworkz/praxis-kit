# Decisions

## Open

### `lib/primitive` — `StylingOptions.presets` vs. `RecipeMap`/`recipe`

`StylingOptions.presets: TPreset` (`lib/primitive/src/types/factory/styling-options.ts`) holds a
`RecipeMap`, selected at the call site by the `recipe` prop — but the field itself is still named
`presets`, not `recipes`. Found while correcting `tooling/codemod`'s README, which had (incorrectly,
inherited from `../pk`) documented a `styling.presets` → `styling.recipes` rename as already
shipped; it never did, in `../pk` or here — `presets` is `../pk`'s current field name too. Whether
to actually rename the field for consistency with `RecipeMap`/`recipe` is an open call for whoever
owns `lib/primitive` next: it's a real inconsistency, but `presets` is meaningfully descriptive on
its own (named variant bundles) and a rename now touches every `StylingOptions` call site across
every already-merged package. If it ever ships, `tooling/codemod` should gain a structural (AST, not
find-and-replace) command for it — see `DECISIONS.md` → "`tooling/codemod` — port scope".

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
`pressedProps`, `selectedProps`, `invalidProps`, `loadingProps`, `readonlyProps`, `activeProps`) are
ported from `../pk` on **Model A**: a truthy state injects the `aria-*` / `data-*` pair, a falsy
state emits `{}`, and an explicitly-supplied `aria-*` / `data-*` value is preserved (the normalizer
only fills when the key is `undefined`).

Open question raised in port review: props with a meaningful false state — `aria-expanded`,
`aria-pressed`, `aria-selected` — arguably want **Model B**, where `expanded: false` synthesizes
`aria-expanded="false"` rather than nothing. Model A does not _prevent_ the false state (a caller
can still pass `aria-expanded={false}` and it is kept); it just does not _derive_ it from the sugar
prop.

Not resolving this now — the consumer that reveals the right answer is `packages/core` / the
factory, which is not ported yet, and the call is likely per-prop (tied to component semantics the
contract layer does not own). `aria-invalid` in particular defaults to `"false"` already, so
emitting it would be redundant. Revisit when core wires the normalizers in; if Model B wins for some
props it lands as a deliberate change with a visible diff in `props/normalizers.test.ts`, which
currently pins Model A across all eight.

### HTML/ARIA contract layer — standards audit before it is authoritative

Pre-1.0 gate, not an adapter blocker. The HTML/ARIA enforcement data in `packages/core` —
`HTML_ARIA_RULES` (the per-tag allowed-role table: `main: []`, `nav: []`, and the special handling
of `h1`–`h6`, `ul`/`ol`/`li`, `a` with/without `href`, `button`, `img`, `input[type]` …),
`ALLOWED_ROLES` / `ALLOWED_INPUT_ROLES`, `STRONG_ROLES`, `IMPLICIT_ROLE_RECORD` — is ported from
`../pk` and carries source comments marking it a partial / heuristic model. It is powerful enough
that a wrong entry makes Praxis _confidently reject valid markup_, so it must be validated
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
- It is a sibling internal building block for the adapter layer (`lib/adapter-utils`, the adapters,
  `plugins/vite`'s compiler), not a public entry point.

It sits _beside_ `packages/core`, not behind it — `core` does not import it.

**Only the `.` entry (render-time helpers) is ported. `./compiler` is deferred.** `../pk`'s compiler
(`compileComponent`, the contribution passes, the domain merge algebra) is built on the pre-rewrite
`@praxis-kit/pipeline` — `createPipeline` / `executePipeline` with a **pluggable `merge` strategy
and `plugins`** — which the `lib/pipeline` rewrite replaced with `runPipeline` + a fixed shallow
`mergeContext`. Porting it verbatim is impossible; it needs a rewrite against the new pipeline
model.

**Update (as of the `plugins/vite` port):** `plugins/vite` was assumed to be `./compiler`'s
consumer, but the reference `@praxis-kit/vite-plugin` does its own `.tsx`/`.jsx` analysis with the
TypeScript compiler API and imports **neither** `@praxis-kit/pipeline` nor `@praxis-kit/runtime`. So
`./compiler` currently has **no consumer in the reference repo**. Options when it next comes up:
keep deferring until a real consumer appears (a `precompute` step for the runtime's
`precomputedClasses` / artifact fast-path is the likely one), or drop it. Not porting it on spec.

`../pk`'s `@praxis-kit/pipeline` also exported a node/tree/capability/merge-strategy model
(`NodeId`, `SlotName`, `CapabilityMap`, `MergeStrategy`) that the rewrite dropped and that the
render-helper IRs still use. These now live in `lib/runtime/src/pipeline-compat.ts` — a
runtime-owned home for pieces that were always more "runtime" than "generic pipeline"; nothing else
in the workspace needs them. `Diagnostic` / `MetadataMap` / `Pass` survived the rewrite and are
re-exported straight through.

Deferred to the compiler rewrite (from the port review): the artifact hash domains need precise
definitions before anything relies on them for cache invalidation (`styling = sha256(metadata)` is
too broad — it should key on variants/recipes/precomputed inputs, not `docs`); `precomputed` merge
is single-owner (document or field-merge); `CapabilityMap` should be enforced boolean. `.`-entry
follow-ups: `TreeContext` is type-immutable but its `Map` / arrays are not frozen at runtime (call
it logically-immutable or snapshot); `getActiveProps` precedence (variants over attributes) wants a
doc comment.

### `packages/core` — private; publishable infra defers to `packages/kit`

`packages/core` is `private: true` in `../pk` — it is not published, it is bundled into `praxis-kit`
(`packages/kit`), the single published package. So the `packages/core` port carries no
`.changeset/config.json`, no CI build/test/release job, and no `build` script / tsdown config; all
of that lands with `packages/kit`. Scaffolded like the `lib/*` packages (minimal `package.json`,
`tsconfig` extends base, `defineLibConfig` vitest).

Adaptations: `@praxis-kit/primitive` and `@praxis-kit/styling` are **`dependencies`**, not
`devDependencies` as in `../pk` — `src/utils/index.ts` / `src/styling.ts` / `src/index.ts` re-export
runtime values from both. `configs/typescript.ts`'s ESLint `allowDefaultProject` list gains
`packages/*/vitest.config.ts` (`packages/core` is the first `packages/*` entry).

Per-slice hygiene (from the slice-1 review): the `package.json` `exports` map and `dependencies`
track what the _current_ slice actually contains — `./contract` is not in `exports` until
`src/contract.ts` lands, and `@praxis-kit/diagnostics` / `type-fest` (both used only by `src/html/`
onward) are added with the slice that first imports them, not up front. `../pk`'s `src/global.d.ts`
(an ambient `process.env.NODE_ENV` declaration "to avoid `@types/node`") was dropped — the repo's
`tsconfig.base.json` already has `"types": ["node"]`, so `process` is typed without it.

**Ported in four PRs (#18–#21):** (1) `src/types/` + `src/utils/` + `./primitive` / `./styling`
entries + scaffold; (2) `src/html/` (contracts / spec tables / rule sets — the bulk, ~1780 LOC) +
`src/children/`; (3) `src/options/` + `src/resolver/` + `src/state/` + `src/validator/`; (4)
`src/factory/` (`createPolymorphic` + the memoized render pipelines: tag / props / HTML
prop-normalizers / HTML children-evaluator / class / ARIA), `src/diagnose.ts`, the `./contract`
barrel, and the final `.` barrel. Otherwise ~verbatim from `../pk`.

Adaptations made during the port review, per slice:

- **Slice 2:** `resolveAllowedRoles`'s `byProp` case resolves an _unrecognized_ discriminator to the
  policy `fallback` — an unknown `<input type>` is checked against `text`'s allowed roles (HTML's
  own "unknown type behaves as text" rule) instead of being skipped as "not modeled".
  `createMutuallyExclusiveRule` tests HTML-boolean-attribute _presence_ (`required=""` /
  `required="required"` count, `required={false}` / absent do not) rather than raw truthiness, which
  missed the string-attribute forms.
- **Slice 3:** `diagnostics.active` → `.warnActive` in `validateFactoryOptions` (the
  `lib/diagnostics` rename; a warning-only validator, so the scope matches). Documented that
  `createResolverPipeline` is a **built-in-rules-only** lightweight path (it takes the minimal
  `ResolverOptions`, no `ariaRules` / `variantKeys`); custom `enforcement.aria` and variant-aware
  validation flow through `createPolymorphic` → `createAriaPipeline`, which threads
  `HTML_ARIA_RULES` + `resolved.ariaRules` + `resolved.variantKeys` into the engine. `allowedAs`
  constrains a caller-supplied `as` override only, not the component's `defaultTag`.
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

Open follow-ups (`.vscode/MIGRATION.md`): ~~`core/utils` bundles contract state-prop normalizers
under a "utils" name~~ (resolved with `packages/kit` — they moved to `@praxis-kit/core/props`);
`primitive.ts` surfaces ARIA-role helpers from `contract/types` despite the filename; the HTML/ARIA
role tables need a standards audit before the contract layer is authoritative (own entry: "HTML/ARIA
contract layer — standards audit before it is authoritative"); the ARIA widget contracts
(`menuContract` etc.) currently enforce accessible naming, not full APG child patterns.

### `adapters/react` — port scope and adaptations

First framework adapter. Ported whole (`src/shared/` + `src/current/` React-19 + `src/legacy/`
React-18 variants, ~2000 src LOC, 33 vitest files / 576 tests, 1 Playwright-CT spec). The adapter is
a thin shell over `@praxis-kit/adapter-utils`: `buildRuntime` wires `buildCoreRuntime` +
`buildEngines` + `composeFilter` + `SlotValidator`; `shared/render.ts` is the React render pipeline
calling `resolveNormalizedProps` / `applyFilter` (the canonical order confirmed at the
`packages/core` slice-4 checkpoint — verified here, nothing missing). `current/` and `legacy/`
differ only in ref handling (React 19 plain-prop ref vs React 18 `forwardRef`) and their `Slot` /
`normalize-children` copies.

- **`exports`:** `.` (React 19) + `./legacy` (React 18). Both mapped in `tsconfig.paths.json`.
- **deps:** `type-fest` + the six workspace `@praxis-kit/*` it imports move to `dependencies`
  (`../pk` had all the praxis deps in `devDependencies`); `react` stays a `>=18` peer; `clsx` was
  listed but unused — dropped. `@praxis-kit/playwright` is a devDep (CT spec only).
- **No per-package `eslint.config.ts`** — the new repo lints from the root config only, and
  `configs/architecture.ts` already declares the `adapters/react` boundary element. `../pk`'s
  per-adapter `no-restricted-imports` (block importing sibling adapters) is a root-config follow-up
  for when more than one adapter exists.
- **Dangling `@praxis-kit/*` eslint-disable directives** (3, for the not-yet-ported
  `no-enforcement-without-strict` rule) rewritten as plain intent comments; re-add the directives
  with `plugins/eslint`.
- `@praxis-kit/shared/tests` (a `../pk` path alias to `lib/primitive/src/tests`) → imported directly
  as `@praxis-kit/primitive/tests` (one hydration-parity test).
- `defineJsdomConfig` reintroduced in `configs/vitest.base.ts` — see the Vitest entry.
- `.pw.spec.tsx` runs under `test:pw` (Playwright-CT) only; not wired into CI here (no browser
  install / CT job yet — follow-up with the first CI workflow).

**Review — `onElement` lifecycle:** legacy `create-contract-component.ts` was missing the "clear
`cleanupRef` before re-invoking `onElement`" step that `current/` has (so a throwing registration on
a replacement element could leave the prior, already-run cleanup to fire again on unmount) —
aligned. Both `on-element.spike.test.tsx` files gained a lifecycle matrix: replacement runs the old
cleanup before the new registration, cleanup runs exactly once on unmount, a `void`-returning
`onElement` is tolerated, a throwing `onElement` leaves no stale cleanup (+8 tests, 586 total).

**Review (P1) — `warnDiscardedChildren` baseline:** the `asChild` discard check compared the _raw_
`children` prop length against the element-only Slot list, so `{cond && <X/>}`, `null`, `false`, and
whitespace-only strings (which React arrays but never renders) counted as "discarded" and produced
spurious warnings. Fixed to compare the _normalized_ child list (elements + non-empty text/number)
against the Slot list — the difference is exactly the text/number siblings Slot genuinely drops; a
zero-element list is left to `assertSingleChild`. Text siblings in `asChild` mode are still
warn-and-dropped (not preserved) — there is no element for Slot to render them into, and the warning
is a real diagnostic, not silent loss. +3 `render.test.ts` cases (real discard, falsy-conditional
no-warn, bare-text → `assertSingleChild`). **Follow-up:** mirror the edge cases in
`interaction.pw.spec.tsx` once the CT job runs in CI.

### `adapters/preact` — port scope and adaptations

Second framework adapter. Flatter than react — Preact has one component model, so no
`current/legacy/shared` split: everything is at `src/` (its own copy of `slot/`, `render.tsx`,
`build-runtime`, `create-contract-component` — it does **not** depend on `@praxis-kit/react`). ~1150
src LOC, 9 vitest files / 162 tests. No Playwright-CT suite in `../pk` (none added).

- **`exports`:** `.` only (Preact 10 is a single target). `peer: preact >=10.11`.
- **deps:** the five workspace `@praxis-kit/*` it imports + `type-fest` → `dependencies` (`../pk`
  had them in `devDependencies`); `clsx` was listed but unused — dropped. No `@praxis-kit/runtime`
  (unlike react — preact doesn't import it). devDeps: `preact`, `preact-render-to-string`, `jsdom`,
  `vitest`, `@types/node`.
- **No per-package `eslint.config.ts`** (root lint), same as react. `import-x/no-duplicates` fixes
  on 3 `../pk` files (`conformance.test`, `create-contract-component.test`,
  `types/polymorphic-props`) that its per-package lint had missed.
- `vitest.config.ts` → `defineJsdomConfig('preact')`.

**Brought to parity with post-review react** (same fixes, applied here proactively):

- `normalize-children.ts` now **keeps non-empty text/number** (`../pk`'s preact version filtered to
  elements only — so its child evaluators never saw text, unlike react's, a real cross-adapter
  contract-enforcement divergence). Added `NormalizedChild = AnyVNode | string | number`; the
  asChild/Slot path filters back to elements via `getSlotChildren`. + `normalize-children.test.ts`
  (was missing).
- `render.tsx` `warnDiscardedChildren` — same raw-vs-filtered baseline bug as react (spurious
  warnings on `{cond && <X/>}` / `null` / whitespace); same fix + zero-guard. +2 asChild discard
  tests.
- `create-contract-component.ts` — added the defensive `cleanupRef` clear-before-re-invoke that
  react's `current/` has; `on-element.spike.test.tsx` gained the same lifecycle matrix (replacement
  / exactly-once / void return / throwing registration).

**Review — conformance evidence** (the point of the preact adapter is to prove the architecture is
framework-neutral, so its semantic test matrix should match react's):

- **Nested-children boundary pinned.** `normalizeChildren` is deliberately one level deep (not a
  `Children.toArray`): a nested array (`{[<A/>, [<B/>, <C/>]]}`) is discarded, a nested Fragment is
  one opaque element (not flattened). Preact still renders nested structures correctly on the
  intrinsic path — normalization only governs what the contract evaluators and the asChild
  single-child check see. +3 `normalize-children.test.ts` cases.
- **Ref chain pinned** for every target kind: intrinsic default, `as` override,
  `as={forwardRef component}` (ref reaches the component-forwarded element), `asChild` (ref →
  slotted child), element replacement (ref moves), unmount (ref → null). +4
  `create-contract-component.test.tsx` cases.
- **Follow-up:** these (nested children, the ref matrix, polymorphic `as`, ARIA normalization)
  belong in the shared `conformanceSuite` (`lib/adapter-utils/src/testing/`) so every adapter runs
  one matrix rather than each re-deriving it; react's `normalize-children.test` should gain the
  matching nested-children cases when that consolidation happens.

**Architecture note** (review, no action): do **not** abstract react + preact's
`createContractComponent` similarity into a shared `framework-runtime/createComponent()`. The
duplication is healthy; the shared layer is `@praxis-kit/adapter-utils` (semantic), not an
abstraction over the React/Preact element APIs.

### `adapters/vue` — port scope and adaptations

Third framework adapter, first non-React-family one — a real fidelity test of the neutral core.
`defineComponent` + `setup()` returning a render function; `h()` render calls (no JSX); children
arrive as Vue `Slots`, not a `children` prop. Flat `src/`. ~840 src LOC, 13 vitest files / 196
tests + a Playwright-CT interaction suite (`.vue` SFC fixtures, `test:pw`).

- **`exports`:** `.` only. `peer: vue >=3.4`.
- **deps:** the five workspace `@praxis-kit/*` + `type-fest` → `dependencies` (`../pk` had them in
  dev). devDeps: `vue`, `@vue/{server-renderer,test-utils,compiler-dom}`, `@vitejs/plugin-vue`,
  `@playwright/experimental-ct-vue`, `@praxis-kit/playwright`, `jsdom`, `vitest`, `@types/node`.
- **No `configs/tsconfig.vue.json`** — Vue needs no `jsx` compiler option; `tsconfig.json` extends
  `tsconfig.base.json` directly and `src/shims-vue.d.ts` covers `*.vue` imports.
- **No per-package `eslint.config.ts`** (root lint). `.vue` fixture files aren't linted (no Vue
  ESLint plugin in the repo config) — only reached by the CT suite.
- `vitest.config.ts` → `defineJsdomConfig('vue')` (the `../pk` `exclude: ['**/*.pw.spec.ts']` is
  redundant — the shared include is `*.test.ts` only).
- `playwright-ct.config.ts` tidied to match react's (explicit `@praxis-kit/*` → source aliases,
  since the CT bundler doesn't read tsconfig paths); `ctPort: 3102`.

**Vue-specific behaviour that is already correct** (no fix needed, unlike the react/preact review
findings):

- `normalizeChildren(slots)` filters `slots.default()` output with `isVNode` and reports a
  `discarded` count. No raw-length-vs-filtered bug: Vue's slot output is the already-rendered vnode
  list — `v-if="false"` is a _comment vnode_ (passes `isVNode`, kept, seen by the evaluator), text
  is a _text vnode_ (kept). A nested array is counted as discarded, not flattened. +2
  `normalize-children.test.ts` cases pin this.
- `onElementRef` in `create-contract-component.ts` already tracks `boundElement` (Vue re-invokes a
  vnode's function-ref on every patch, not just mount/unmount) and clears `cleanup` before rebinding
  — so same-element re-invocation is a no-op and a throwing registration leaves no stale cleanup.
  The react/preact "defensive clear" fix is already present here in a stronger form.

**Conformance evidence added:** a user's `ref` on `<Box>` resolves to the _component instance_ in
Vue, not the host element — `onElement` is the adapter's contract for the real DOM node, so
`on-element.spike.test.ts` gained the full matrix in its place: host element across an `as` override
and the `asChild` path, cleanup-before-replacement, cleanup-exactly-once on unmount,
`void`-returning `onElement`, throwing `onElement` on a replacement.

**Second review pass — three contract decisions resolved + a real bug fixed** (`../pk`'s Vue adapter
had these; 209 → 219 tests):

- **VNode classification for the asChild target.** `normalizeChildren`'s "only element nodes"
  comment was wrong — `isVNode` also passes Text / Comment / Fragment. The asChild path now narrows
  the child list to element/component vnodes via `isElementVNode` (`slot/predicates.ts`) before
  picking the single clone target — mirroring how react/preact narrow their normalized list back to
  elements. A Comment (`v-if="false"`) sibling is ignored silently; a dropped Text sibling warns.
- **asChild prop merging aligned with the other adapters.** `../pk` forwarded only
  string/number/boolean attributes onto the cloned child — `@click`, `:style`, object props were
  silently dropped. Now the wrapper's resolved props (listeners, `style`, `class`, `role`, the
  `onElement` ref) are handed to `cloneVNode`, whose `mergeProps` chains `onXxx` handlers,
  concatenates `class`, and shallow-merges `style` — the same policy as `mergeSlotProps` in
  `@praxis-kit/adapter-utils` (react/preact Slot). Tests pin chained-onClick and merged-style.
- **`normalizeListenerKey` fixed.** `../pk` lowercased the whole event name (`onKeyDown` →
  `onkeydown`), which only "worked" via the DOM IDL property, not Vue's event system, and broke
  `Once`/`Passive`/`Capture` modifiers entirely. Now it collapses the event name to a single leading
  capital (`onKeyDown` → `onKeydown` → Vue `hyphenate` → `keydown`) and preserves the modifier
  suffix. New `event-normalization.test.ts` matrix: `onClick` / `onKeyDown` / `onPointerDown` /
  `onMouseEnter` / `onBeforeInput` bind to the right DOM event on the intrinsic and asChild paths;
  `onClickCapture` keeps its capture option.
- **Conformance `rerender` is now a real update.** `../pk`'s Vue conformance adapter did
  `unmount()` + `mount()`, so the perf/isolation suites never observed a Vue _update_. Rewritten to
  raw `render(h(Component, props), container)` (a second `render()` patches, like the Preact
  adapter), so `rerender` exercises the update path.
- **Reactivity proof:** `computed(prepareRenderState)` — an unrelated parent update does not re-run
  the resolution pipeline (deps unchanged); a real prop change does. +2 tests.

**Follow-up:** the `RenderResult.rerender` contract (`lib/adapter-utils`) is sync `void`; Vue's
`@vue/test-utils` updates are async. The raw-`render()` conformance adapter sidesteps this, but a
future `rerender` that returns `void | Promise<void>` would let all adapters use their idiomatic
test driver.

### `adapters/solid` — port scope and adaptations

Fourth framework adapter, second non-React-family one — a compiler-based reactivity model rather
than a virtual DOM, the sharpest fidelity test of the neutral core yet. Fine-grained reactivity via
`createMemo`/`createEffect` (no re-render, no VDOM diff); JSX compiled by Solid's own Babel
transform, not React's. Flat `src/`. ~1000 non-test src LOC, 6 jsdom vitest files + 2 SSR vitest
files / 149 tests. Ported **verbatim — no bug fixes needed**, the first adapter slice where that's
true (react/preact/vue each needed at least one real correctness fix during review).

- **`exports`:** `.` only. `peer: solid-js >=1.6`.
- **deps:** `@praxis-kit/{adapter-utils,core,diagnostics,primitive}` + `type-fest` → `dependencies`
  (matches vue's convention — `../pk` had some of these in `devDependencies`). devDeps: `solid-js`,
  `@solidjs/testing-library`, `vite-plugin-solid`, `jsdom`, `vitest`. No `@types/node` — nothing
  imports a `node:` builtin (and, unlike react/vue, there's no Playwright-CT setup for this adapter
  in `../pk` — no `playwright-ct.config.ts`, no `.pw.spec.tsx` files — so no
  `@praxis-kit/playwright` / `@playwright/experimental-ct-*` deps either).
- **`configs/tsconfig.solid.json` already existed** (`jsx: "preserve"`,
  `jsxImportSource: "solid-js"`) — landed speculatively with the ESLint port. `tsconfig.json`
  extends it and includes both vitest configs directly (react/preact/vue's pattern — no
  `allowDefaultProject` entry needed, unlike `lib/*`).
- **No per-package `eslint.config.ts`** (root lint, matching every other adapter) — `../pk`'s had a
  `no-restricted-imports` sibling-adapter-isolation rule; not recreated, same as it wasn't for
  react/preact/vue (see the react entry's follow-up — now overdue with a 4th adapter, still not this
  slice).
- **Split test config, ported as-is: `vitest.config.ts` (jsdom) + `vitest.ssr.config.ts` (node).**
  Solid ships mutually exclusive browser/server builds of `solid-js/web` selected by Vite resolve
  `conditions` (`['development','browser']` vs `['development']`, no `'browser'`) — the SSR file's
  `renderToString` throws under the browser build, and jsdom can't run the server build's code path
  at all. Not folded into the shared `defineJsdomConfig` (a jsdom-only helper); the package's own
  `test` script runs both configs in sequence, which is what `pnpm -r test` actually invokes —
  confirmed the SSR suite runs. The root workspace `vitest.config.ts` project glob only picks up
  `vitest.config.ts` by name, so `vitest.ssr.config.ts` is invisible to a bare root `vitest` command
  — a pre-existing, accepted gap (same shape as `plugins/typescript`'s build config being outside
  the root glob).
- **`configs/architecture.ts` gap found and fixed:** the `core` boundary's disallow list forbade
  `react`/`vue`/`preact`/`svelte` importing into `packages/core`, but not `solid-js` — added
  `'solid-js'` + `'solid-js/**'` alongside the existing entries.
- **Solid keeps its own `SlotValidator`** (`src/slot/slot-validator.ts`), not the shared
  `@praxis-kit/adapter-utils` one react/vue/preact use. This is intentional, not a missed
  consolidation: the shared `SlotValidator` validates a _child-count_ contract
  (`assertSingleChild(count)` — asChild clones props onto exactly one child element), because
  React/Vue/Preact's `asChild` takes ordinary JSX children. Solid's `asChild` takes a **render-prop
  function** as `children` (`{(props) => <a {...props} />}`) — there's no child element to count, so
  the contract is `assertRenderFn(children): children is (props) => unknown` instead. Both extend
  the same `InvariantBase` and use `SlotDiagnostics` (`renderFnRequired` was already ported with
  `lib/contract`, evidently anticipating this).
- **README fixes** (found while writing it, not carried from `../pk` verbatim):
  - The `asChild` usage example showed React/Vue's single-child-element syntax
    (`<Button asChild><a href="/home">Home</a></Button>`) — wrong for Solid, and would throw at
    runtime (`assertRenderFn`). Replaced with the real render-prop syntax and a sentence explaining
    why it differs from the other adapters.
  - The "Exports" table listed `createPolymorphicComponent` / `createAriaEnforcedComponent` /
    `createChildrenEnforcedComponent` — none of which `src/index.ts` exports (only
    `createContractComponent` and `defineContractComponent` do). This exact wrong table also appears
    in `adapters/react/README.md` and `adapters/vue/README.md` — a stale copy-paste artifact
    predating this repo, not something solid introduced. Fixed here; **follow-up:** audit react's
    and vue's README export tables against their real `src/index.ts` too (both already merged, out
    of scope for this slice).

**Review pass:**

- **`tryRenderAsChild`'s fallback under `strict: 'warn'` locked down as an explicit contract, not
  just "doesn't throw".** Both of its guards (`assertExclusive` for `as`+`asChild` together,
  `assertRenderFn` for non-function `children`) route through `InvariantBase.violate` →
  `Diagnostics.error()`. Under the adapter's `strict: 'throw'` default that throws and nothing after
  it runs (already pinned by two tests). Under `strict: 'warn'`/`'silent'` it only reports (or does
  nothing) and returns normally — so `tryRenderAsChild` returns `null` to its caller, and `render()`
  falls through to the **ordinary DOM-tag render path**, exactly as if `asChild` (and, for the
  exclusivity guard, `as`) had never been set. A malformed `asChild` usage degrades to a plain
  render rather than rendering nothing or silently swallowing the children. +2 tests pin the exact
  result (`<div>not a function</div>` for the non-function-children case; `<section>` — not `<div>`
  — for the `as`+`asChild` case, `as` still applying). A comment on `tryRenderAsChild` in
  `render.tsx` states this explicitly now; previously it was true but only inferable from tracing
  three call sites.
- **`ResolvedSlotProps`'s `ref`/`role` typing — the doc comment moved here, from an in-source block
  that had grown to architectural-decision-record length.** `PropsOf<G>` stays `Partial` for the
  same reason `AsChildProps` does: the type system can't prove every prop actually received a
  default, only that the runtime _tried_. `ref` is typed `(el: Element) => void` rather than
  `AsChildProps.ref`'s bare `unknown`, because a render function's own job is spreading this object
  directly onto a concrete element (`(props) => <a {...props} />`) — it needs a callback-ref shape
  assignable to that element's own `ref` prop type, and contravariance makes an `Element`-typed
  callback assignable to any more specific one (`(el: HTMLAnchorElement) => void`, …) without
  knowing `TAs` in advance; `AsChildProps.ref` itself stays `unknown` because that field types what
  a _caller_ hands in before the render function has even run, not what the render function receives
  back out. `role` (added by `buildSlotProps` only when `isKnownAriaRole` narrows it) is omitted
  from the type entirely, rather than given any explicit type — every candidate representation fails
  the same way `ref` almost did: Solid's own per-element JSX types (`AnchorHTMLAttributes['role']`,
  etc.) each narrow `role` to only the ARIA roles valid for _that_ element, a strict subset of the
  full ARIA vocabulary, so a `KnownAriaRole`-typed field fails to spread onto any of them — and
  unlike `ref`, there's no contravariance trick for a plain string-literal property (`unknown` fails
  the same assignability check `KnownAriaRole` does; only `any` would satisfy every per-element
  union, and this codebase doesn't use `any`). Omitting the key keeps `{...props}` spreads honest
  and compiling; a render function that specifically needs `role` casts locally. (Previously this
  whole parameter was bare `UnknownProps` — no type checking at all.)
- **`ElementRef<T>` confirmed correctly scoped, not too narrow — no change needed.**
  `ElementRef<T> = T extends IntrinsicTag ? HTMLElementTagNameMap[T] : unknown` looks like it could
  under-cover SVG/custom elements, but `IntrinsicTag` is itself defined as
  `keyof HTMLElementTagNameMap` (`lib/primitive/src/types/intrinsic-tag.ts`) — every polymorphic
  target this repo recognizes as "intrinsic" already _is_ an `HTMLElementTagNameMap` key by
  construction. `as="circle"` (an SVG tag) falls to `ElementType`'s other arm (`string & {}`), so
  `ElementRef<'circle'>` is honestly `unknown`, not incorrectly typed as an `HTMLElement` subtype.
  Praxis Kit's polymorphic targets are deliberately HTML-only; this is shared, pre-existing
  `lib/primitive` behavior, not solid-specific, and every other adapter relies on the same scoping.
- **The `TPlugin` cast in `create-contract-component.ts`'s `buildRuntime(options as …)` call is
  accepted as-is** — it's a documented generic-invariance/`exactOptionalPropertyTypes` limitation
  (the same class of gap `NormalizeFn` bivariance notes elsewhere in this codebase), not a hidden
  runtime risk: `TPlugin` is erased at runtime, so no type guard could check it regardless. Not
  worth more generic machinery to eliminate.

**Follow-up (substantial — not this slice): a shared, explicit cross-adapter conformance contract.**
`lib/adapter-utils/src/testing` already gives every adapter (react/preact/vue/solid) one shared
`conformanceSuite`/`conformanceA11ySuite`/`conformancePerformanceSuite`/
`conformanceIsolationSuite`/`ssrConformanceSuite` — each adapter supplies a small
`ConformanceAdapter` (create/render/rerender/cleanup/capabilities) and the suites run the same
assertions against it. What's proposed and not yet true: (1) organizing it as its own package
(`packages/adapter-conformance` or similar) rather than a `testing` subpath of `lib/adapter-utils`;
(2) more granular named sub-suites per concern (refs, slots/asChild specifically, SSR hydration
parity) rather than the current coarser grouping; (3) a documented per-adapter capability/exception
matrix (`capabilities: { asChild: false, … }` already exists as a mechanism — formalizing what it
covers and why per adapter is the gap). The value case the reviewer raised is real: this is exactly
the mechanism that would catch a "React: asChild resolves defaults / Solid: asChild forgets
defaults" class of drift automatically instead of by manual review — but it's a cross-cutting
restructuring across every already-merged adapter, sized for its own slice once `svelte`/`lit`/`web`
exist too (more data points on what's genuinely shared vs. framework-specific before committing to
the sub-suite boundaries).

### `adapters/svelte` — port scope and adaptations

Fifth framework adapter, third non-React-family one — and the most architecturally distinct yet.
Svelte components must originate from `.svelte` files (a compile-time constraint no JS factory can
work around), so **`createContractComponent` returns a plain `BuiltRuntime` bundle, not a
component** — every bundle renders through one shared `<Polymorphic bundle={...}>` component
(`src/Polymorphic.svelte`, typed via a hand-written `Polymorphic.svelte.d.ts` sibling, the mechanism
`configs/tsconfig.svelte.json`'s `allowArbitraryExtensions` exists for). Svelte 5 runes
(`$props`/`$derived`/`$effect`) for reactivity; `<svelte:element>` for the dynamic tag; Snippets
(`{#snippet}`/`{@render}`) as the render-prop mechanism. Flat `src/`. ~700 non-test src LOC (TS +
one substantial `.svelte` file), 7 vitest files (6 jsdom + 1 SSR) / 122 tests.

- **`exports`:** `.` → `src/index.ts` (as every other adapter); `./Polymorphic.svelte` → the
  `.svelte` file directly — `../pk`'s `dist`-pointing exports map adapted to this repo's
  consumed-from-source convention, same as every other adapter has no build.
- **deps moved from `devDependencies` to `dependencies`:**
  `@praxis-kit/{adapter-utils,core, diagnostics}` — `../pk` had these three as dev (with only
  `primitive` + `clsx` + `type-fest` as real deps), inconsistent with every other adapter's "praxis
  deps → dependencies" convention (react/preact/vue/solid). `clsx` dropped — unused
  (`Polymorphic.svelte` builds its own class string via the shared class-resolution pipeline, never
  calls `clsx` directly).
- **No per-package `eslint.config.ts`** (root lint, matching every other adapter) — `../pk`'s had
  the same sibling-adapter `no-restricted-imports` rule react/preact/vue/solid's did; not recreated,
  same follow-up as those.
- **`configs/architecture.ts` and `configs/tsconfig.svelte.json` needed no changes** — both already
  had `svelte` wired in (the `core`-boundary disallow list already listed `'svelte'`/`'svelte/**'`;
  solid's port is what had a gap, not this one's).
- **Split test config, ported as-is** (same shape as solid, same reason): `vitest.config.ts` forces
  `conditions: ['browser', 'development']` so `@testing-library/svelte` gets the DOM-capable
  `svelte/internal` entry; `vitest.ssr.config.ts` runs only `ssr.test.ts` under
  `environment: 'node'` with no condition override (Svelte 5's compiled output is universal —
  `vite-plugin-svelte` picks the target itself). The package's own two-config `test` script is what
  `pnpm -r test` runs.

**A third `asChild` model, distinct from both other variants already in this repo.**
React/Vue/Preact clone props onto a single child _element_ (`assertSingleChild(count)` — a
count-based contract). Solid takes a render-prop _function_, needing a runtime `assertRenderFn`
guard since JS doesn't enforce that shape (`adapters/solid`'s own DECISIONS.md entry). Svelte needs
**neither guard**: its compiler always wraps a component's default slot content into a callable
Snippet, so `children` is guaranteed to already be "a function, if present" by the time
`Polymorphic.svelte` sees it — there's no runtime shape to assert, only presence (`{#if children}`
before `{@render children(...)}`). It uses the shared `@praxis-kit/adapter-utils` `SlotValidator`
(the same one vue/react/preact use, constructed with `'Snippet'` as the element-kind label) purely
for `assertExclusive()` — the `as`+`asChild` mutual-exclusion check — never `assertSingleChild` or
`warnDiscardedChildren`, since there's no child list to count in the first place.

**`tryRenderAsChild`-equivalent `strict:'warn'` fallback pinned proactively, applying the Solid
review lesson before being asked.** `useAsChild`'s `assertExclusive()` call has the identical
`InvariantBase.violate` semantics as every other adapter's: `strict:'throw'` throws (existing test),
`strict:'warn'` only reports and `useAsChild` resolves to `false`, so `Polymorphic.svelte`'s
`{:else}` branch renders the ordinary `<svelte:element>` at the `as`-resolved tag — same contract as
Solid's, same fallback-not-blank-render behavior. +1 test pins the exact result
(`<section>...</section>`, `as` still applying, not `<div>`).

**Comment density: `ResolvedSlotProps`'s doc trimmed proactively**, applying the Solid review lesson
rather than waiting for the same feedback twice. Original (`types/resolved-slot-props.ts`) ran ~36
lines explaining why `ref`/`role`/`style` are omitted from the asChild-snippet prop type; trimmed to
a 5-line pointer + the usage example. Full case, preserved here: `ref` is omitted because Svelte has
no `ref` prop concept at all (DOM access is `bind:this`/`onElement`) — a caller who writes a literal
`ref` key gets it forwarded like any other unknown prop, untyped, since there's no contravariant
callback-ref trick to apply the way Solid's `ResolvedSlotProps` does. `role` is omitted for the same
reason Solid's is: every representation either is too wide to spread onto an unknown target
element's own narrower per-element `role` union, or (`unknown`) fails that same assignability check
outright. `style` is omitted because, unlike the non-asChild `<svelte:element>` path (which
serializes a `StyleObject` to a CSS string via `serializeStyle`), the asChild path skips
serialization entirely — a caller's `style` prop passes through however they wrote it (object or
string), so there's no one shape to assert.

**Two README bugs found, one severe.** `../pk`'s README (carried in unread) claimed:

- **"The returned value is a Svelte component. Use it in a `.svelte` file: `<Button size="lg">`."**
  This isn't a wrong-syntax example like Solid's — it misstates the adapter's entire architecture.
  `createContractComponent` returns a bundle; there is no `Button` component to use as a JSX-like
  tag. Rewrote the Usage section around the real, working pattern
  (`export const buttonBundle = createContractComponent(...)`, then
  `<Polymorphic bundle={buttonBundle} .../>`), taken from `create-contract-component.ts`'s own doc
  comment, plus the `asChild` snippet syntax.
- **The "Exports" table listed `createPolymorphicComponent`/`createAriaEnforcedComponent`/
  `createChildrenEnforcedComponent`** — the same stale artifact found in react's, vue's, and solid's
  READMEs (see `adapters/solid`'s entry). Fixed here to the two real exports plus a row for the
  `./Polymorphic.svelte` subpath, since using this adapter at all requires importing it.

**`.prettierignore` gained `*.svelte`.** No `prettier-plugin-svelte` in the catalog, so plain
Prettier can't parse `.svelte` at all ("No parser could be inferred") — `pnpm format`/
`format:check` would hard-error on both `.svelte` files in this repo (the first ones to exist).
Pre-existing gap in `../pk` too (same missing plugin, same files) — never surfaced there because
nothing apparently ran `prettier --check .` broadly enough to hit it. Ignored rather than fixed
properly (adding the plugin + verifying its formatting choices) — revisit if `.svelte` formatting
consistency becomes a real need, not just a `format:check` crash to avoid.

**Review pass:**

- **The event-normalization contract stated and pinned exactly** (`event-normalization.test.ts`, 9
  cases). `normalizeEventKeys`'s `/^on[A-Z]/` lowercasing is a deliberate compatibility feature (a
  caller writes React-style `onClick`; Svelte needs native lowercase `onclick`), but its actual
  reach at runtime is wider than the function itself, because Svelte's own `<svelte:element>` spread
  treats **any** `on`-prefixed key as event-related regardless of what this function does to it:
  `onCustomThing` lowercases and binds via `addEventListener` for the literal synthetic event name
  (fires only if something dispatches a `CustomEvent` under that name — proven by dispatching one);
  a plausible component-level callback name like `onValueChange` gets the identical treatment and is
  never invoked directly — there is no separate "custom callback prop" convention this adapter
  recognizes; `once` / `on-value` (no camelCase to normalize) pass through this function unchanged,
  but Svelte's runtime still recognizes the literal `on` prefix and silently drops a non-function
  value rather than rendering it as an attribute — this happens whether or not `normalizeEventKeys`
  runs, so a future change to the function can't fix or break it. Pinned as an explicit contract in
  both the function's comment and the tests, not left implicit.
- **The style-serialization contract stated and pinned exactly** (`style-serialization.test.ts`, 5
  cases). `serializeStyle`'s `key.replace(/([A-Z])/g, '-$1').toLowerCase()` preserves a CSS custom
  property (`--my-color` has no uppercase letters to rewrite) and correctly hyphenates a
  vendor-prefixed property including its leading dash (`WebkitLineClamp` → `-webkit-line-clamp`, the
  real CSS spelling) — both previously true only as an unstated property of the regex, now asserted
  by test. `value == null` (not `=== undefined`) keeps a falsy `0` (`opacity: 0`) while dropping a
  real `undefined`. Assertions read the parsed `CSSStyleDeclaration` (`element.style.*`), not the
  raw attribute string — the browser's own CSS parser reflows what `serializeStyle` hands it (adds
  whitespace, and normalizes a unitless `0` length to `0px`), so the literal string is an
  implementation detail and the parsed value is the real contract.
- **asChild test depth extended** (`Polymorphic.test.ts`): variant classes and ARIA role resolution
  reaching the slot snippet are now asserted, not just base class + arbitrary props. The ARIA case
  surfaced a real, correct-but-previously-undocumented asymmetry: the non-asChild `<svelte:element>`
  path (`buildDomProps`) strips a role that's redundant with the _target tag's_ implicit role via
  `runtime.resolveAria`, but the asChild path (`buildSlotProps`) has no target tag to check
  redundancy against — the caller's snippet decides what renders — so it only validates the role is
  syntactically real (`isKnownAriaRole`) and forwards it as-is, never stripping for redundancy. Same
  contract as Solid's `buildSlotProps` (`adapters/solid/src/render.tsx`) — cross-adapter consistent,
  not a Svelte-specific gap.
- **A reactivity test for asChild was attempted, failed for an instructive reason, and was replaced
  rather than dropped or force-fit.** Driving it through `@testing-library/svelte`'s `rerender()` +
  `createRawSnippet` (the mechanism every other asChild test in this file uses) never observed an
  updated prop — `createRawSnippet`'s params are captured once at setup and are documented by Svelte
  itself as non-reactive, a testing-helper limitation, not a fact about `Polymorphic.svelte`. Real
  reactivity needed a real `$state` host: `asChild-reactivity.spike-host.svelte` owns a `$state`
  class and exposes `setExtra` as a component export; `asChild-reactivity.test.ts` drives it via
  `component.setExtra(...)` + `tick()` and confirms the slot snippet's rendered DOM picks up the new
  resolved class. 144 tests total (119 jsdom + 25 SSR, up from 122).
- **SSR lifecycle guarantees asserted explicitly** (`ssr.test.ts`, +2 tests): `onElement` is never
  called and the children evaluator's `evaluate` is never invoked during `svelte/server`'s
  `render()` — both DOM-only features `Polymorphic.svelte` gates behind
  `typeof document !== 'undefined'` (registering their `$effect`s during SSR throws `effect_orphan`;
  the earlier "renders without throwing" test only proved the guard prevents a crash, not that the
  gated features stay inert). **Gap recorded, not silently assumed covered:** this repo has no
  Svelte hydration-_transition_ test (server-render, mount client-side over that markup, confirm no
  mismatch) the way `adapters/solid/src/hydration-parity.test.tsx` does for Solid — `../pk` doesn't
  have one for Svelte either. A real one needs `svelte/server`'s `render()` output fed into a jsdom
  container, then `mount()` (not `render()`) over it.
- **Generic erasure made an explicit, documented design decision**, not just an implicit consequence
  of `PolymorphicComponentProps.children: Snippet | Snippet<[UnknownProps]>`. Added to that type's
  own doc comment, and to the README ("`<Polymorphic>` is intentionally generic-erased…") — one
  physical `.svelte` file/`.d.ts` serves every bundle's `G`; it can't become `Polymorphic<G1>` vs.
  `Polymorphic<G2>` per call site the way a generic React function component can. Precision is
  recovered on the caller's side via `ResolvedSlotProps<GenericsOf<...>>`.
- **Confirmed, no change: the `adapter-utils` boundary is correct as drawn.** `buildCoreRuntime` /
  `buildEngines` / `composeFilter` / `resolveAdapterCommonOptions` / the shared `SlotValidator`
  living in `@praxis-kit/adapter-utils` rather than duplicated per-adapter is exactly the trajectory
  this port has followed since `packages/core`+`lib/adapter-utils` — not something to second-guess
  now that a 5th adapter is using it identically.

**Follow-ups (not this slice):**

- **A Svelte-specific `asChild` conformance sub-suite** — a concrete, scoped instance of the
  cross-adapter conformance follow-up already recorded under `adapters/solid`. The generic
  `conformanceSuite` can't represent a Svelte snippet (`capabilities: { asChild: false }` in
  `conformance.test.ts` is why), so asChild's real coverage lives only in this package's own
  `Polymorphic.test.ts` — direct, not a hole, but not shared with the other adapters either. The
  concrete shape worth building toward: resolved classes, filtered props, variants, ARIA resolution,
  caller-prop preservation, `as`+`asChild` rejection, and correct rerendering — each already has a
  direct test _in this package_ after this review pass; turning that into a reusable per-adapter
  sub-suite (Solid could plug in a comparable one) is the future step.
- **Publishing the `.svelte` asset is a `packages/kit`-build-slice concern, refined.**
  `exports: { "./Polymorphic.svelte": "./src/Polymorphic.svelte" }` here works because the monorepo
  consumes everything from source. Once `packages/kit` builds and publishes `praxis-kit`, the
  `.svelte` file itself (not just compiled JS) must survive into the published package — most
  bundlers don't copy arbitrary non-JS/TS assets by default. When that slice lands, verify
  `praxis-kit/svelte` _and_ `praxis-kit/svelte/Polymorphic.svelte` both resolve from an actual
  packed tarball (`npm pack` / `pnpm pack`), not just the workspace's symlinked `node_modules` — a
  real, common way for exactly this kind of non-JS export to work in a monorepo dev loop and
  silently 404 for an external consumer.

### `lib/styling` — dropped the `variant-pass` "proof path"

`../pk/lib/styling/src/variant-pass/` carried three demo passes (`basePass`/`hoverPass`/`focusPass`,
Tailwind literals like `inline-flex` / `hover:bg-blue-500`), a `styleMergeStrategy`, and a
`style-proof.test.ts` that hand-rolled a pipeline loop over them. All three built on the pre-rewrite
`@praxis-kit/pipeline` API (`Pass<TContext>` + a pluggable `MergeStrategy<TContext>`). The rewritten
`lib/pipeline` keeps `Pass` but replaced `MergeStrategy` with a fixed shallow `mergeContext` (see
its own entry), so `styleMergeStrategy` / `style-proof.test.ts` no longer compile, and nothing
outside `lib/styling` ever imported `basePass` / `styleMergeStrategy`.

Dropped the proof path entirely rather than retarget dead demo code. Kept the parts real consumers
use: `createVariantPass` / `VariantConfig` / `CompoundVariant` (from `variant-pass.ts`, no pipeline
dep) and `buildPrecomputedKey` / `compileVariantLookup` (from `compile-variant-lookup.ts`), which
`lib/adapter-utils` consumes. `DefaultMap` (was a shared `@praxis-kit/pipeline` alias for
`StringMap<string>`) is now defined locally in `compile-variant-lookup.ts` and re-exported —
`lib/styling` no longer depends on `lib/pipeline` at all. `clsx` / `type-fest` also dropped from its
deps (unused directly; `cn` from `primitive` owns `clsx`).

Two consistency fixes from the port review:

- **Recipe semantics unified.** `VariantClassResolver.#compute` gated on `if (!recipe)`, so
  `recipe: ''` was "no recipe" there while `createClassPipeline` / `StaticClassResolver` /
  `diagnoseClassPipeline` (and the cache key) all treat `recipe !== undefined` as active. Now the
  whole package follows one rule: `undefined` is "no recipe", every string is a recipe key.
- **`compileVariantLookup` honors array compound conditions.** `matchesCompound` did an exact `!==`,
  but a `CompoundVariant` condition value can be `readonly string[]` (`size: ['sm','lg']`) and
  `diagnoseClassPipeline` already matches those. The compiled precomputed table now matches runtime
  CVA semantics.

Documented (not changed): the precomputed lookup is the no-recipe path — its keys are variant props
alone, this resolver's are `recipe | props`, so a recipe-active call never hits it. Still open (P3):
the cache-key serializer (`s:` / `x:` prefixes) does not escape delimiters — a theoretical
collision, not reachable with normal CVA string-literal variant values.

### `lib/pipeline-kit` — kept as its own package, not folded into `lib/pipeline`

`../pk` had `@praxis-kit/pipeline-kit` alongside `@praxis-kit/pipeline`; the migration tracker
carried it as "❓ keep? — decide if the new `lib/pipeline` absorbs this".

Kept separate. The two are different abstractions:

- **`lib/pipeline`** (rewritten during its own port) — a data-processing runtime: `Pass` objects,
  `runPipeline`, phased composition, `{ patch, diagnostics, metadata }` accumulation with
  sequential/parallel strategies.
- **`lib/pipeline-kit`** — a bare _callable-function_ composition toolkit:
  `Pipeline<TArgs, TOutput> = (...args) => TOutput`, plus `composePipelines` (chain), `allPipelines`
  (tuple, `Promise.all`-shaped), `anyPipeline` (first defined wins), and `definePipeline` (a
  `PipelineFactory` memoized by the resolved-config object identity via a `WeakMap`). ~140 LOC, zero
  `@praxis-kit` deps (only `type-fest`).

`packages/core` imports `definePipeline` / `PipelineFactory` / `Arguments` directly for its render
pipelines. Folding pipeline-kit into `lib/pipeline` would mean reconciling two unrelated `Pipeline`
shapes — a redesign, not a port. Ported verbatim; one lint adaptation (praxis-kit's
`unicorn/no-useless-undefined` turned `return undefined` / `() => undefined` into `return` /
`() => {}`).

### `lib/contract` — `aria-level` value range: `{ min: 1 }`, no maximum

`../pk` typed `aria-level` as `{ kind: 'integer', min: 1, max: 6 }` in `ARIA_VALUE_TYPES`, with an
engine test asserting `aria-level="7"` warns. WAI-ARIA defines `aria-level` as `min 1` with **no
maximum** — `1–6` is only the HTML `h1`–`h6` heading range, and `aria-level` also applies to
`treeitem`, `row`, `listitem`, deeply nested headings, etc. with no cap.

Resolved in slice 3b: the table entry is now `{ kind: 'integer', min: 1 }`. Heading-specific
concerns stay covered — `AriaPolicyEngine.#checkRedundantAriaLevel` still flags an `aria-level` that
merely restates a heading element's implicit level. A hard `1–6` ceiling scoped to `role="heading"`
was considered and **not** added: ARIA itself does not require it, deep-nesting cases legitimately
exceed 6, and no consumer needs it. The ported `aria-level="7"` test is updated to assert it is now
accepted.

### `lib/contract` — `AriaPolicyEngine` orchestrates; new rules live outside it

`aria/aria-policy-engine.ts` is ~840 lines as ported: context derivation, empty-role normalization,
plan cache + key construction, rule selection, `#runRules`, fix sorting/apply, `report()`, **and**
all ~20 built-in rule bodies as private static methods. Coherent today (every part belongs to one
engine), but at the edge of becoming a god object.

Not refactoring the existing file now — the port stays faithful and the rules-as-private-statics
shape is stable. Going forward, though: **a new ARIA semantic rule does not get added as another
`AriaPolicyEngine.#checkX` method.** It goes under `aria/spec/` (the standards-derived data),
`aria/spec/validators/` (shared checking logic, like `checkRequiredAttributes`), or a new
`aria/rules/` module, and the engine's `#pipeline` / `#implicitOnlyRules` arrays just reference it.
The engine orchestrates: derive context → select policy → run rules → collect violations → apply
fixes → return. When several existing rules next need to change together, that is the moment to
extract them outward too.

### `lib/contract` — port scope and review outcomes

Ported from `../pk` in seven PRs (#9–#15), each reviewed on landing, kept as **one package**
(`@praxis-kit/contract`) — the boundary ("the contract runtime: ARIA engine, structural child rules,
`InvariantBase` severity routing, plus the contract-specific diagnostics/types/prop normalizers
every adapter and `packages/core` consume") is coherent. Depends on
`@praxis-kit/{primitive,diagnostics}` and `type-fest`; `primitive` is the single ARIA/child
vocabulary and this package only interprets it.

Slices: `src/types/` → `src/diagnostics/` + `src/props/` → `src/aria/spec/` + policy → `src/aria/`
`AriaPolicyEngine` + tests → `src/strict/` → a focusability/numeric correctness pass →
`src/children/`.

Changes made during the port (beyond the dedicated entries above for the false-state model,
`aria-level`, and the "engine orchestrates" convention):

- **`types/aria/aria-role.ts`** reduced to a re-export of `primitive`'s `AriaRole` (`../pk`
  redefined it identically). Same "keep `@praxis-kit/contract` a complete surface" reasoning keeps
  the `isInvalid` re-export from `./aria` even though it is a bare `primitive` predicate.
- **`InvariantBase.active` → `warnActive`**, tracking the identical rename in `lib/diagnostics`. One
  consequence: `ChildrenEvaluator.evaluate()`'s cheap early-return gate is now visibly
  Warning-scoped, while child violations are Error severity — a hand-built "report errors, ignore
  warnings" policy would over-skip. Every non-silent `DefaultPolicy` preset reports Warning, so it
  is latent; commented at the call site, tracked in `.vscode/MIGRATION.md`.
- **`polymorphic-validator.ts` → `aria-policy-engine.ts`**, `aria-policy-engine.helpers.ts` →
  `.test-helpers.ts` — the file names now match the class and the `aria-policy-engine.*.test.ts`
  suite; the helper name marks it test-only.
- **`INTERACTIVE_TAGS` → `NATIVE_INTERACTIVE_TAGS`** and its comment no longer claims the members
  are "always keyboard-reachable"; a real **`isPotentiallyFocusable(tag, props)`**
  (`aria/spec/elements/focusable.ts`, prop-aware: `href`, `type="hidden"`, `disabled`, `tabindex`,
  `contenteditable`) replaced the bare tag-set check in `#checkAriaHiddenOnFocusable`. Documented as
  tabbability, not raw focusability (`tabindex="-1"` deliberately excluded).
- **Strict ARIA numeric parsing** — `strictNumeric()` (whole string must be numeric; `""` is not
  `0`) replaced `parseFloat`/`parseInt` in `#isValidAriaValue` and `#checkRedundantAriaLevel`.
- Normative ARIA tables carry `// Source:` provenance lines; `REQUIRED_ARIA_PROPERTIES` and
  `NAME_REQUIRED_ROLES` are marked intentionally partial; `HtmlDiagnostics.input`
  `attributeIgnoredForType` takes a typed `InputIgnoredAttribute` key (no runtime throw);
  `ContractDiagnostics` message grammar normalized to `component:`.
- **Children: the `position="first"|"last"` ⇒ `max=1` invariant moved into `normalizeChildRule`.**
  `../pk` checked it in a `ChildrenEvaluator` helper (`checkPositionCardinalityInvariant`) that ran
  on the static rules only when no dynamic rule existed, and separately on resolved dynamic rules —
  so a contradictory _static_ positional rule slipped through whenever the evaluator also held a
  dynamic rule, and `diagnoseChildren` never checked at all. Normalizing is where a
  structurally-impossible rule is a bad rule, so the throw lives there now and both APIs inherit it;
  the evaluator helper is deleted. Regression tests added for the static+dynamic case and for
  `diagnoseChildren` parity.
- Documented in `rules-matcher.ts`: a rule with a unique `type` matches on `child.type` alone — its
  `match` predicate is not called on the fast path (a `match` that needs to narrow further must omit
  `type` or share it).

Open follow-ups (all in `.vscode/MIGRATION.md`): the `warnActive`-scope gate above; a roleless
focusable element (`<div tabindex="0" aria-hidden>`) is skipped because `AriaPolicyEngine.evaluate`
short-circuits on `!hasRole`; the name-required check treats `'aria-label' in props` as sufficient
(`<img aria-label="">` passes) — only matters if `NAME_REQUIRED_ROLES` grows; a `role="img"` element
still needs the missing-`alt` HTML fact handled separately; a typed `primitive` implicit-role lookup
would drop the one `tag as Tag` cast in `getImplicitRole`.

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
  _static_ roles belong in it. `STRONG_ROLES` is flagged standards-sensitive — a heuristic that
  needs an HTML-AAM / ARIA-in-HTML citation pass and dedicated conformance tests before it is
  canonical; do not widen it without both. Tracked in `.vscode/MIGRATION.md`.
- **`createObservable`** — no per-listener `try/catch` is deliberate (a throwing listener is the
  adapter's bug to surface); documented + tested.
- **Complexity watches** (comments in the code, no change yet): `ResolvedFactoryOptions` — split
  into `Resolved{Rendering,Styling,Enforcement,…}Options` before adding a new concern, not append
  fields; `iterate.ts` — keep to genuinely shared primitives.
- **Root barrel stays broad but subpaths are the direction.** `src/index.ts` re-exports everything;
  `./types`, `./guards/aria`, `./constants/aria`, etc. exist so consumers can express narrow intent.
  Push new consumers to subpaths as the package grows.

### Type organization: `src/types/` folder + barrel is the package default

`../pk` used a `src/types/` folder with grouped files and an `index.ts` barrel in 16 of 17 packages;
a single `src/types.ts` was one exception (`lib/diagnostics`, 47 lines). This repo standardizes on
the folder everywhere — mixed conventions across ~26 packages cost more than one directory, and the
folder scales without churn (a new type is a new file, not a growing monolith).

Two carve-outs:

1. **Co-locate a type with its behavior module when it has one.** `Severity` lives in `severity.ts`,
   `DiagnosticPolicy` in `policy.ts`, `DiagnosticCode` in `codes.ts`. `types/` holds only pure-data
   shapes with no natural home module — wire/descriptor types.
2. **A lone `types.ts` is acceptable only for a genuinely tiny package** — one cohesive group, no
   growth path. Promote to `types/` at the first second group.

`lib/pipeline` already conforms. `lib/diagnostics` was promoted from `types.ts` to
`types/{diagnostic,reporter}.ts` + barrel as part of its port.

### `lib/diagnostics` — API changes made during the port

Reviewed the ported surface and changed it rather than freezing `../pk`'s shape:

- **The policy owns enforcement; reporters only report.** `Diagnostics.report` checks the policy
  first — `Ignore` drops, `Throw` raises a `PraxisError` inline, only `Report` reaches the reporter.
  `ThrowingReporter` was **removed** (dead — a reporter never got the chance to throw). "Strict
  mode" is a policy with `throwThreshold: Severity.Error`, not a reporter.
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
- **Dropped the `type-fest` dependency** — `DiagnosticInput` uses built-in
  `Omit<Diagnostic, 'severity'>` instead of `Except`. No other repo code used `type-fest`.
- **`AnyRecord` is imported from `@praxis-kit/primitive`.** `primitive` is the single source of
  truth for `AnyRecord`/`StringMap`; `primitive` also imports the `Diagnostics` type from here, so
  this forms a package cycle — but a **type-only** one, fully erased at build time, so it is
  accepted rather than duplicating the primitives. `@praxis-kit/primitive: workspace:*` is a
  declared dependency of `lib/diagnostics`. **On the architectural watch list** (port review):
  accepted now because the alternative — a premature `@praxis-kit/types` / `@praxis-kit/shared` leaf
  — is worse. If such a genuinely independent leaf package ever exists for its own reasons,
  `primitive ↔ diagnostics` is the first cycle to move into it.

### `lib/diagnostics` — `Diagnostic.context` vs `.metadata`

Both are `Record<string, unknown>` bags today, and left to drift they become the same thing. The
intended split, documented on the types in `types.ts`:

- **`context`** — data a _reader_ needs to understand the diagnostic; the values a formatter
  interpolates into `rationale`/`message` (offending prop name, expected vs actual child, ARIA
  token). Human-oriented.
- **`metadata`** — data a _consumer_ keys off (build plugin, editor integration, telemetry); never
  rendered to a person. Machine-oriented.

Direction (from the README): grow structured `context` fields so formatters derive messages instead
of callers pre-formatting them — but **add no field to either bag without a concrete consumer**.

### `lib/diagnostics` — `HTML`/`ARIA` are spec validity; `Accessibility` is guidance

The `DiagnosticCategory` taxonomy keeps a deliberate split, mirrored by the code ranges in
`codes.ts`:

- **`HTML` (`HTML3xxx`) / `ARIA` (`ARIA2xxx`)** — spec compliance. The markup or ARIA usage is
  _invalid_ per the HTML standard or the ARIA spec. A fact.
- **`Accessibility` (`A11Y8xxx`)** — best-practice guidance. The usage is spec-valid but
  inadvisable. Advisory.

A rule goes in `Accessibility` **only when it is not** an `HTML`/`ARIA` validity fact. This lets
consumers treat the two classes differently (e.g. fail a build on validity errors, only warn on
guidance). Documented on the enum itself in `category.ts`; do not let new codes blur the line.

**APG authoring practices are guidance, not validity** (port-review guardrail). Praxis must not
progressively enforce every WAI-ARIA APG recommendation as if it were a platform violation. The
line: an APG "should" (unique landmark names, `menu` inside a `menubar`, roving-tabindex order, APG
child-composition patterns) is `Accessibility` / `warning` at most — never `HTML`/`ARIA` / `error`.
Only a genuine HTML-spec or ARIA-spec invalidity is `HTML`/`ARIA`. `requireAccessibleName`
(`packages/core` widget contracts + the `nav`/`aside` landmark rule) is deliberately `warning`
severity for exactly this reason; keep it and any similar check scoped that way. The role-table
standards audit (own entry) is the companion task — get the validity facts right, and keep
everything else advisory.

### Type assertions (`as` / `as unknown as`) — fine at boundaries, suspicious in enforcement logic

Port-review guardrail. The codebase carries ~20 `as` / `as unknown as` casts. The rule for keeping
that number honest:

- **Acceptable** — a cast at a framework or type-system boundary: the `createPolymorphic` /
  `createContractComponent` return (`assembled as MergeRecords<…>` — a conditional type TS can't
  prove while generics are open, guarded by a runtime `invariant`), React ref shapes
  (`Ref<T> | null` narrowing), `ElementForTag<…>` on the DOM ref API, adapter `FactoryOptions`
  guards. These sit where the type system genuinely can't follow and a runtime check or a
  well-understood invariant backs them. Each should carry a one-line comment saying which.
- **Suspicious** — a cast inside semantic enforcement logic (contract evaluation, ARIA rule results,
  diagnostic construction, children matching). There the types _are_ the specification; a cast is
  usually a modelling gap to fix, not paper over.

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
so a tree can mix them. `runPipeline` reduces every node — `Pass` or nested `Pipeline` — to the same
`{ patch, diagnostics, metadata }` outcome, then folds those outcomes per strategy:

- **sequential** — a barrier between nodes; each node sees the previous node's merged context.
- **parallel** — every node runs against the same input (`Promise.all`); patches are checked with
  `detectConflicts` and merged. Diagnostics and metadata still accumulate in node order so the
  result is deterministic.

**A parallel key conflict throws `ParallelConflictError`, it is not a diagnostic.** Two concurrent
nodes writing the same key with no ordering between them is a pipeline _authoring_ bug — there is no
correct merged value to pick. Diagnostics are for invalid _input_, not invalid pipelines. Fail fast,
name the pipeline and the keys.

A nested pipeline running as a parallel node contributes `shallowDiff(input, itsResult)` — it saw
the same input a sibling pass saw, and `mergeContext` keeps untouched keys by reference, so the diff
is exact for untouched keys and conservative (flags a change) for a key reassigned to an
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
  not special. The pipeline package assigns meaning only to _order_. Consumers (the compiler, the
  runtime) attach the behaviour.
- Naming each phase sub-pipeline means a `RunResult`'s diagnostics and any tree-walking tooling can
  attribute work to a phase without a separate phase concept in the executor.

### `lib/pipeline` — sequential executor is `runPipeline`, always async, returning `RunResult`

`runPipeline(pipeline, input)` walks `pipeline.nodes` in order with a barrier between each: a leaf
`Pass` is `execute`d and its patch folded in via `mergeContext`; a nested `Pipeline` runs in place
and its whole outcome is folded into the parent's accumulation.

- **`RunResult` is not `PassResult`.** `PassResult` is a _patch_ one pass proposes
  (`context?: Partial<TContext>`); `RunResult` is the fully accumulated state the executor owns —
  final `context: TContext`, and the concrete `diagnostics` / `metadata` collected across the run. A
  pass never sees a `RunResult`. This is the "execution result vs accumulated context" boundary.
- **Always returns a `Promise`.** A node may be an async pass (`MaybePromise`), so the executor
  awaits every node. A synchronous fast path for all-sync runtime pipelines is a later performance
  concern — not built until benchmarks justify it.
- **Diagnostics concatenate** in run order. **Metadata shallow-merges** in run order (last key
  wins); passes that must not collide namespace their keys. Metadata is never merged into `context`.
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
`environment: 'jsdom'` _and_ an include policy of `src/**/*.test.{ts,tsx}` (test files sit beside
`.tsx` source, and `.pw.spec.tsx` must be left for the Playwright-CT runner, not picked up by
Vitest). Both are enforced last, same as `defineLibConfig`; `overrides` carries only `setupFiles`
etc. Every framework adapter uses it.

### `plugins/eslint` — port scope

`@praxis-kit/eslint-plugin`, ported ~verbatim (7 rules — `no-dead-compound`,
`no-enforcement-without-strict`, `no-invalid-default`, `no-invalid-html-nesting`,
`no-redundant-role`, `valid-cardinality`, `valid-children-config` — + `types/` + `utils/`, ~1775 src
LOC, 120 tests via `@typescript-eslint/rule-tester`).

- **deps:** `@praxis-kit/{diagnostics,primitive}` + `@typescript-eslint/utils` + `type-fest` →
  `dependencies`; `eslint >=9` peer; `@typescript-eslint/rule-tester` + `typescript-eslint` +
  `eslint` dev. `../pk`'s `@praxis-kit/pipeline` devDep dropped (unused).
- **scaffold:** standard `lib/*` shape — `exports` `.` → `src/index.ts`, `tsconfig.json` extends
  base, `vitest.config.ts` = `defineLibConfig('eslint-plugin')`. `../pk`'s `tsdown.config.ts` /
  `tsconfig.build.json` / `build` scripts dropped (the repo defers package builds; the plugin is
  consumed from source in-repo and `private: true`).
- **`repository.directory`** corrected `packages/eslint-plugin` → `plugins/eslint`.
- Wired into `tsconfig.paths.json` + root `references`, and into the root `eslint.config.ts` (see
  the ESLint entry below).

**Dependency-boundary note** (port review). The ESLint layer must understand Praxis _contracts_, not
adapter/runtime internals. It does today: its `@praxis-kit/primitive` imports are only the
framework-neutral utilities (`iterate`, `isObject`, `isString`, `AnyRecord`, `StringMap`), and its
one semantic dependency is the `@praxis-kit/diagnostics` taxonomy (`DiagnosticCategory` /
`DiagnosticCode` — the shared diagnostic identity across runtime / TS-plugin / ESLint). It does
**not** import `lib/runtime`, `lib/adapter-utils`, or any adapter.

- **Follow-up (real coupling):** `src/utils/implicit-roles.ts` (`IMPLICIT_ROLES`) and
  `src/utils/html-nesting.ts` + `content-model-builders.ts` (`TAG_CATEGORIES`, content models) are
  _hand-maintained parallel copies_ of `packages/core`'s `HTML_ARIA_RULES` / role tables and
  `lib/contract`'s ARIA spec — a deliberate static-only subset (a lint rule sees only the tag name,
  can't evaluate `<a href>` conditionally), but a divergence risk. Fold this into the "HTML/ARIA
  contract layer — standards audit" task: one normative source, ideally one set of data with the
  plugin consuming a static projection of it.

### `plugins/typescript` — port scope

`@praxis-kit/typescript-plugin` (renamed from `../pk`'s `@praxis-kit/ts-plugin` — see below), ported
~verbatim (~295 src LOC, no tests, no `@praxis-kit/*` deps). A TypeScript language-service plugin:
proxies `getSemanticDiagnostics` and adds `checkNoEnforcementWithoutStrict` (code 90001) plus
`checkValidCardinality` (90002–90004) from its own tiny AST walker (`walkEnforcement`).
`export = init` (CJS).

- **Build scripts kept** (`build` / `dev` via `tsdown`), unlike every other package here — a TS LS
  plugin is `require()`d by `tsserver` as compiled JS from `dist/index.js`; it _is_ its build
  output, there is no from-source consumption. `tsdown.config.mts` → `format: ['cjs']`,
  `neverBundle: ['typescript']`.
- **`tsconfig.json` is standalone** (not `extends: ../../tsconfig.base.json`): `module: CommonJS`,
  `moduleResolution: Node` (node10), `outDir: dist`. This is deliberate and is the concrete reason
  `typescript` is catalog-pinned to `>=6 <7` — the `typescript/lib/tsserverlibrary` import and
  node10 resolution are a hard error in TS 7 (`TS5108`). See `CLAUDE.md`.
- `peer: typescript >=5.0`. Added to root `tsconfig.json` `references`; no `tsconfig.paths.json`
  entry (nothing imports it). `configs/typescript.ts` already lists
  `plugins/typescript/tsdown.config.mts` in `allowDefaultProject`.

**Port-review changes:**

- **Renamed `@praxis-kit/ts-plugin` → `@praxis-kit/typescript-plugin`** — pairs obviously with
  `@praxis-kit/eslint-plugin`; nothing depended on the old name (clean-room). Propagated to the
  diagnostic `source` string and the `configs/architecture.ts` boundary label.
- **README corrected** — it claimed the diagnostics show up "in `tsc` output" and that
  `--generateTrace` makes a CLI build load the plugin (both false). It is now unambiguously an
  editor/`tsserver` tool; CI enforcement is `@praxis-kit/eslint-plugin` + runtime.
- **Diagnostic location narrowed** — `no-enforcement-without-strict` (90001) now anchors on the
  offending `children` / `aria` key, not the whole factory call.
- **`max: 0` no longer flagged** (dropped code 90005 / `ZERO_MAX_CODE`, and the matching `zeroMax`
  rule + template + `DiagnosticCode.LintZeroMax` usage in `plugins/eslint`) — see the contract
  decision below. `DiagnosticCode.LintZeroMax` stays reserved in `lib/diagnostics/codes.ts`.
- **Error-vs-warning rule stated** in the README + code: impossible/self-contradictory contract →
  error; potentially-unintended → warning. (Same spirit as the `Accessibility`-is-guidance taxonomy
  guardrail.)

**Follow-ups (not this slice):**

- **Shared diagnostics core.** `plugins/eslint` and `plugins/typescript` now hold _two_
  implementations of `no-enforcement-without-strict` + `valid-cardinality` (different AST models —
  `@typescript-eslint` estree vs `tsserverlibrary`). They can drift. The target: a framework-neutral
  rule engine (`validateCardinality({min,max}) → { code, severity, message }`) that both plugins
  translate their AST into and render from. Sits alongside the `plugins/eslint` "one HTML/ARIA data
  source" follow-up.
- `isFactoryCall` matches on callee name only — `otherLib.createContractComponent(...)` matches too.
  Make the config able to pin the import module identity.
- Rule parity with `plugins/eslint` (`no-invalid-default`, `no-dead-compound`,
  `valid-children-config`) — `no-invalid-html-nesting` is lower priority (no JSX/HTML model in the
  LS plugin).

### `plugins/vite` — port scope

`@praxis-kit/vite-plugin`, ported (~2800 src LOC after the deferral below, 7 vitest files / 148
tests). Six build-time Vite plugins that parse `.tsx`/`.jsx` with the **TypeScript compiler API**
(`import ts from 'typescript'`, not babel):

- `contractPlugin` — static `enforcement.children` cardinality + ARIA-override checks, single-file
  (`transform`) and cross-file (`buildEnd`, via a `ConstraintRegistry`).
- `compoundPrunePlugin` — strips dead `styling.compounds` entries.
- `classExtractPlugin` — injects a static `precomputedClasses` map into each factory call.
- `slotTransformPlugin` — rewrites safe `asChild` sites to the render-prop form.
- `staticCompositionPlugin` — inlines statically-analyzable usage sites to direct element creation.
- `ssrOptimizePlugin` — the bundle of the three transforms in dependency order.

- **deps:** `@praxis-kit/{core (type-only),diagnostics,primitive}` + `typescript` → `dependencies`
  (`typescript` is a real runtime dep — the plugin bundles compiler-API calls); `vite >=5` peer;
  `vite` + `vitest` + `@types/node` dev. `type-fest` dropped (was design-tokens-only).
- **scaffold:** standard `lib/*` shape — `exports .` → `src/index.ts`,
  `defineLibConfig('vite-plugin')`, no build script. `../pk`'s `tsup` build config dropped entirely
  (rather than converted to `tsdown`) — nothing consumes it in-repo; a real build lands with the
  release pipeline. `type: module`.
- `repository.directory` corrected `packages/vite-plugin` → `plugins/vite`. Added to root
  `tsconfig.json` `references`; no `tsconfig.paths.json` entry (only self-referenced in JSDoc).

**`designTokensPlugin` was deferred then restored.** `src/design-tokens.ts` + `.test.ts` are the
only modules that import `@praxis-kit/tailwind` (`layoutKeys`). PR #30 landed the plugin without
them; the `lib/tailwind` PR restored them (+ the `./design-tokens` re-exports in `index.ts`, the
`@praxis-kit/tailwind: workspace:*` dep, and the README section). Nothing else in the plugin touches
Tailwind. vite-plugin: 151 → 163 tests.

**Port-review changes:**

- **`parseSource` derives `ScriptKind` from the extension** (`.ts` → `TS`, `.tsx` → `TSX`, `.js` →
  `JS`, …; unknown → `TSX`). `../pk` always parsed as `TSX`, so a `.ts` file's `<T>expr` type
  assertion (valid in `compoundPrune` / `classExtract`, which run on `ALL_EXTS`) was mis-parsed. +3
  `ast.test.ts` cases.
- **README + `package.json` reframed** — it _is_ a small static compiler, not a "misc plugin
  collection": description updated; cross-file analysis stated as "best-effort static analysis, not
  whole-program verification" (`import * as X` / deep barrels / dynamic config are left alone); SSR
  made the headline use case; `staticCompositionPlugin` marked **experimental** pending differential
  tests.

**Review pass 2 (with the `lib/tailwind` slice that restored `designTokensPlugin`):**

- **`designTokensPlugin` clears its accumulator on `buildStart`** — without it a watch-mode rebuild
  after a file is deleted/renamed keeps the removed component's classes in the emitted manifest. +1
  lifecycle test (`164` tests).
- **Output root via `configResolved(config).root`** instead of the
  `(this as unknown as { config? }).config?.root` reach into an internal-ish context shape.

**Follow-ups (design toward — not this slice):**

- **Extract a framework-neutral `lib/compiler`** — `parse / analyze / transform / optimize / emit`,
  with `plugins/vite` (and eventually a Rollup/Webpack/esbuild adapter, and the `plugins/typescript`
  diagnostics) as thin adapters. The five Vite plugins are really _one pipeline_ wearing Vite's
  independently-ordered-transform clothing. This is the same consolidation as the `plugins/eslint` +
  `plugins/typescript` "shared diagnostics core" follow-up — one target:
  `Praxis static compiler → { validation, optimisation, transforms } → {Vite, TS} adapters`.
- **Source maps.** The transforms return `{ code }` with no `map`. For AST→AST→source, and for
  diagnostics that must point at the _original_ line after several transforms, source-map
  preservation is a production-readiness requirement before the optimiser is called stable.
- **Import-aware `isFactoryCall`** (shared with `plugins/typescript`, and more dangerous here since
  this _rewrites_ code) — recognise `createContractComponent` only when imported from
  `@praxis-kit/*`, not an unrelated same-named function.
- **`classExtractPlugin` large-map strategy** — the 512-combination cap is a fine safety valve; a
  shared/generated asset (vs. an inline literal per module) is the eventual answer for big maps, and
  for not emitting the data when the component is tree-shaken away.
- **`staticCompositionPlugin` differential tests** — render the inlined output vs the runtime path
  and assert DOM/attr equivalence, across refs / context / defaults, before dropping the
  experimental label. Reviewer: highest-value testing work; ~20–30 targeted cases across
  `slotTransform` / `staticCompose` / `classExtract` would do.
- **`designTokensPlugin` manifest keying** — keyed by bare component name, so `admin/Button` +
  `public/Button` merge. Fine while the manifest's job is Tailwind safelisting (the flat
  `allClasses` union is what matters); revisit with a module-path key + friendly name as metadata if
  the per-component map gains a real consumer.

### `tooling/codemod` — port scope

`@praxis-kit/codemod`, ported ~verbatim (~20 src files, ~430 non-test LOC, 22 tests). A `ts-morph`
CLI with three commands — `migrate` (the recommended one-pass), `rename`
(`createPolymorphicComponent` → `createContractComponent` across ESM named imports/exports), and
`migrate-paths` (`@praxis-kit/*` → `praxis-kit/*` specifiers, incl. `require()` / dynamic
`import()`, with `@praxis-kit/eslint-plugin` → `praxis-kit/eslint` as the one special case).
`migrate` runs rename **before** paths so the `PRAXIS_PACKAGE` filter still matches `@praxis-kit/*`
specifiers; both orders are idempotent and the suite pins that.

- **deps:** `ts-morph` (catalog) → `dependencies`; `@types/node` + `tsdown` + `typescript` +
  `vitest` (all catalog) dev. No `@praxis-kit/*` deps — it operates on _consumer_ source text, not
  the kit's own types.
- **Build scripts kept** (`build` / `dev` via `tsdown`), like `plugins/typescript` and unlike the
  `lib/*` / `plugins/vite` packages — this is a runnable `praxis-codemod` bin (`dist/index.js`, ESM,
  `#!/usr/bin/env node` banner), not a from-source library. `tsdown.config.ts` ported verbatim
  (`entry: src/index.ts`, `format: ['esm']`, `dts`, `clean`, `fixedExtension: false`).
- **`tsconfig.json` is standalone** (not `extends: ../../tsconfig.base.json` — base is `noEmit` +
  `moduleResolution: bundler`): `module` / `moduleResolution: NodeNext`, `outDir: dist`,
  `rootDir: src`, `types: ["node"]`, `+ skipLibCheck`. `vitest.config.ts` uses the repo's
  `defineLibConfig('codemod')` (was a hand-rolled `defineConfig` in `../pk`).
- Added to root `tsconfig.json` `references` and `.changeset/config.json` `ignore` (private, bundles
  into `praxis-kit`); no `tsconfig.paths.json` entry (nothing imports it). `configs/typescript.ts`
  `allowDefaultProject` and `configs/architecture.ts` already listed the `tooling/codemod` paths.

**Port-review changes:**

- **Deleted 3 dead re-export shims** — `src/types.ts` (re-exported `./types/index.js`),
  `src/transforms/rename-symbol.ts` (`renameInProject`), `src/cli/project.ts` (`buildProject`).
  Nothing imported any of them; the real modules are imported directly.
- **`usage.ts` no longer reads a sibling `.md` at runtime.** `../pk` did
  `readFileSync(new URL('./usage.md', import.meta.url))` and never copied `usage.md` into `dist` (it
  wasn't in `files` either) — so the standalone `--help` / no-args / unknown-command paths threw
  `ENOENT` in a built CLI. The text is now an inline `const usage` string; `usage.md` deleted. Also
  fixes the prettier-mangled markdown (`*` → `\*`, collapsed command list) the old file had.
  Verified end-to-end: `node dist/index.js --help` and `migrate --dry-run --verbose` both work.

**Review pass 2 (README accuracy + `rename` scope):**

- **README "Migrations" restructured for versioning clarity.** It listed two dated sections (v1.0.0,
  v3.1.0) with no signal for whether either was historical or proposed — a reader could reasonably
  wonder if the codemod was meant to walk several Praxis generations. Added a one-line framing
  ("each subsection is a migration that has already shipped; there is currently one") so the single
  real, automated migration reads unambiguously as current, not as the first of a series.
- **The v3.1.0 section's claim was wrong, not just ambiguous.** It documented `styling.presets` →
  `styling.recipes` as a completed rename needing manual find-and-replace. It never shipped —
  `presets` is still the real `StylingOptions` field name, in `../pk` and here (confirmed by reading
  the source, not just the docs). A codemod or a user manually "fixing" this per the old README text
  would have broken working code by renaming to a key the type doesn't have. The section now says so
  plainly and points at the "Open" item above; the `variantKey` → `recipe` prop half of the old
  claim **is** real but is ancient/already-complete history with nothing left to migrate, so it's
  dropped rather than presented as still-actionable.
- **`rename`'s scope stated explicitly** (README, `--help` text, and a code comment on
  `renameInProject`): it renames a Praxis-Kit factory bound to a `@praxis-kit`/`praxis-kit`
  specifier, not an arbitrary same-named symbol — and, for an unaliased import, the rename reaches
  every reference to that binding project-wide (bare references, `.method()` calls, …), not just the
  import/export line, because it's a real `ts-morph` identifier rename. Both branches were already
  correct; only the documentation was unclear about which. +2 tests pin the cascade (`fn.bind(...)`,
  a bare reference) and comment preservation on the specifier line. 24 tests.

**Follow-ups (not this slice):**

- **The `praxis-codemod` bin ships inside `praxis-kit`.** `packages/kit` needs a `bin` entry + a
  build entry that bundles `src/index.ts` (with the shebang banner) — lands with the `packages/kit`
  build, alongside the deferred tsup→tsdown work.
- **A future structural property-migration command** — reviewer-suggested: recognize
  `styling: { presets: {...} }` and a `recipe`-style JSX attribute via `ts-morph`'s AST rather than
  find-and-replace, avoiding the false-positive risk of renaming an unrelated same-named object key
  or prop. There is nothing to migrate for `presets` today (see the "Open" item above) — this stays
  a template for whenever a real mechanical field/prop rename ships, not a command to build now
  against a rename that doesn't exist.
- **A richer migration report** — reviewer-suggested: a structured summary (renames / path rewrites
  / files modified, plus a "skipped: namespace imports / CJS destructuring" count) instead of the
  current one-line `message`. The `Summary`/`RenameSummary`/`PathSummary`/`MigrateSummary` types
  already carry the counts a nicer formatter would need; this is a `create-command.ts` presentation
  change, not a transform change.
- **Keep the transform layer framework-neutral** — reviewer's architectural note, worth recording
  even though nothing prompted it yet: this package should stay scoped to the Praxis Kit public
  API/contract surface (paths, factory names, eventually API properties). Framework-specific
  migration logic (React-only, Vue-only, …), if it's ever needed, belongs elsewhere rather than
  growing branches inside `tooling/codemod`.
- `isFactoryCall` equivalent: `rename` matches a named import by name + a `@praxis-kit`/`praxis-kit`
  module filter, which is right, but the same import-identity rigor as the `plugins/*` follow-ups
  would let it also handle re-export chains.

### Contract: `cardinality: { max: 0 }` is the canonical "forbid this child type"

The child-rule runtime (`lib/contract` `RuleValidator#validateCardinality`) treats _any_ match
against a `bounded` rule with `max: 0` as a violation — so
`{ type: Footer, cardinality: { max: 0 } }` is a precise, declarative "no `Footer` children
allowed". It is **expressive, not suspicious**: neither `plugins/eslint` nor `plugins/typescript`
flags it. An impossible combination (`max < min`, negative bounds) is still an error.
`normalizeChildRule` already accepts `{ min: 0, max: 0 }` (only `min > max` throws).

### ESLint: ported from `../pk`

`eslint.config.ts` + `configs/{base,typescript,architecture,imports,unicorn,types}.ts` are ported.

The **`@praxis-kit` plugin + self-validation block are wired back in** as of `plugins/eslint` (PR):
`eslint.config.ts` imports `./plugins/eslint/src/index`, registers it globally so disable-directive
validation resolves, and runs all seven rules over
`{packages,adapters,examples}/*/src/**/*.{ts,tsx}`. `../pk`'s separate `configs/praxis-plugin.ts` is
**not** recreated — it only existed to feed the per-adapter `eslint.config.ts` files, and this repo
lints from the root config alone. The 3 react-test sites that verify the adapter's
unset-`diagnostics` default now carry real
`// eslint-disable-next-line @praxis-kit/no-enforcement-without-strict` directives again (they were
plain comments while the rule didn't exist).

`configs/architecture.ts`'s `boundaries/elements` patterns were pointed at the real target dirs
(`plugins/eslint`, `plugins/typescript`, `plugins/vite`, `lib/tailwind`, `tooling/codemod`) — still
inert for the ones whose dirs don't exist yet.

### Git workflow: `main` stable, `develop` integration

`main` holds only stable, released state. `develop` is the integration branch — feature branches
start from `develop` and merge back into it; `develop` merges into `main` at a release. A local
(un-versioned) `.vscode/tasks.json` carries the workflow helpers — `Git: sync repository` fetches
and hard-resets **both** `main` and `develop` to their origins then prunes gone branches;
`Git: switch develop` and the individual `Git: reset … to origin` / `Git: prune gone branches` tasks
are also exposed. `Git: prune gone branches` deletes a local branch when its upstream is `[gone]`
**and** it is merged into `develop` or `main` (feature branches merge into `develop`, so a
`--merged=main` check — the original — never matched). The whole `.vscode/` directory is
`.gitignore`d and was scrubbed from history; the tasks file is a local convenience, not a repo
artifact. A `Git: start feature` task is deferred — the branch name needs input, so it is handled
outside a plain shell task for now.

### `lib/tailwind` — port scope

`@praxis-kit/tailwind`, ported ~verbatim (~800 non-test src LOC, 8 vitest files / 350 tests) — the
last untouched `lib/*`. A layout-aware Tailwind class pipeline: `createTailwindPipeline` (composed
via `@praxis-kit/pipeline-kit`), `ClassClassifier` / `ClassBuilder`, `LayoutState`,
`DependencyEvaluator` + `defaultDependencyRules`, `layoutKeys`, and `tailwind-safelist.css` (a
`@source inline(…)` asset copied verbatim into the published dist and content-checked by
`tailwind-safelist.test.ts`).

- **deps:** `@praxis-kit/{core,diagnostics,pipeline-kit,primitive}` + `type-fest` → `dependencies`
  (`../pk` listed `@praxis-kit/contract` but the code imports `@praxis-kit/core` — corrected);
  `@types/node` dev (test-only `node:fs` / `node:url`).
- **scaffold:** standard `lib/*` — `exports` `.` + `./safelist.css`, `tsconfig.json`
  `include: ["src"]` (**not** `["src", "./vitest.config.ts"]` — `configs/typescript.ts`'s
  `allowDefaultProject` already owns `lib/*/vitest.config.ts`, and having both errors the project
  service), `defineLibConfig('tailwind')`. `../pk`'s `tsup` build config dropped.
- `repository.directory` corrected `packages/tailwind` → `lib/tailwind`. Wired into
  `tsconfig.paths.json` + root `references`.
- **`.prettierignore`** gained `lib/tailwind/src/tailwind-safelist.css` — the repo's global
  `singleQuote: true` rewrites its `@source inline("…")` directive (quote + line-wrap), breaking the
  test that asserts its exact content. That file is a verbatim published asset, not
  prettier-managed.
- **`plugins/vite`'s `designTokensPlugin` restored** now that `@praxis-kit/tailwind` exists (see the
  `plugins/vite` entry).

**Port-review notes (all doc-only — the review was "keep this architecture, don't refactor"):**

- README now states the conceptual boundary — "a semantic bridge between Praxis layout props and
  Tailwind utility classes", a **lexical, Tailwind-aware** classifier (not a config-resolving
  Tailwind parser), and documents the `family` model: `none` = "not a flex/grid formatting context",
  _not_ `display: none`; item-context utilities (`self-*`, `order-*`, `col-*`, …) are never stripped
  by the element's own mode (they describe it inside its _parent's_ context).
- **Optional renames deferred** (reviewer: "minor, not urgent"): `family: 'none'` → `'neutral'`; the
  internal `deadVariant*` naming → `variantOnlyStripped` (the _diagnostic message_ is already
  precise — "contributes only classes stripped under this mode"). Both touch a merged package's
  public type / `DiagnosticCode`, so not worth the churn mid-port.
- **Follow-up — differential testing across the layers**: the Tailwind pipeline, the `plugins/vite`
  optimiser, and the runtime component system now overlap enough that the real remaining risk is
  _between_ them (a class the Tailwind layer strips vs one the Vite `classExtract` precomputes vs
  what the runtime resolver emits). Fold into the `staticCompositionPlugin` differential-tests
  follow-up.

### Bundler: tsdown (not tsup)

`../pk` catalogs both `tsup` and `tsdown`. This repo standardises on **tsdown** for package builds;
`tsup` is removed from the catalog. Revisit only if a concrete blocker surfaces.

### Release flow: Changesets

`@changesets/cli` is in the foundation commit (catalog + root `devDependencies`, `changeset` /
`version` / `release` scripts). **`.changeset/config.json` landed with `packages/kit`.**

- **`praxis-kit` (`packages/kit`) is the only versioned package.** Every `@praxis-kit/*` workspace
  package is private and bundled into it, so all of them are in the config's `ignore` list.
  `privatePackages: { version: true, tag: true }` so Changesets versions `praxis-kit` while it is
  still `private: true` (publishing is separately gated — see below).
- `changelog: "@changesets/cli/changelog"` (the built-in) — a `@changesets/changelog-github` upgrade
  is a follow-up (needs the extra dep).
- `baseBranch: main` — releases are cut from `main`.
- The **CI release job** and the **first publish** are still deferred: they need `packages/kit` to
  have a real build, which needs the remaining adapters (`solid`, `svelte`, `lit`, `web`) and
  `tooling/codemod` — the `exports` map and `../pk`'s `tsup` config both reference them.

### `packages/kit` — scaffold (the `v1.0.0` line)

Ported as a **scaffold**, not the full build package. What landed:

- `package.json` at `0.0.0`, `private: true`, with the `exports` / `typesVersions`-shaped surface
  for the entries whose source exists (`react` + `/legacy`, `preact`, `vue`, `tailwind` + `.css`,
  `eslint`, `ts-plugin`, `vite-plugin`, `contract`, `guards`, `html`, `utils`) and their optional
  peer deps. `../pk`'s `version: 7.8.1` dropped.
- The four framework-neutral entry files (`contract.ts` / `guards.ts` / `html.ts` / `utils.ts`).
- `.changeset/config.json` (above).

**`packages/kit`'s entry files are pure pass-throughs.** `contract.ts` (and the others as they get
the same treatment) is a stack of `export * from '<subpath>'` lines with **no hand-curated name
lists** — the curated public surface lives one layer down, in purpose-named entries of the lower
packages, where the docs also live:

- `@praxis-kit/contract/props` (the 8 state-prop normalizers) → re-exported by
  `@praxis-kit/core/props`
- `@praxis-kit/primitive/types/factory` (the factory-authoring types) — `FactoryOptions` /
  `AnyFactoryOptions` now carry the "`satisfies` this to narrow `styling.compounds`" doc on the type
  itself, not in a `packages/kit` comment
- `@praxis-kit/core/state` (the 8 state contracts + `mergeContracts`)
- `@praxis-kit/core/aria` (**new** — the ARIA-rule authoring surface: the fix factories +
  rule/result types; the one place that still curates a list, since the source barrels are broader
  than the intended public set)
- `@praxis-kit/core/diagnostics-api` → `Diagnostics` as a **structural interface**, not the
  `@praxis-kit/diagnostics` class type. The class has `private` members ⇒ nominal type ⇒ a plugin
  typed against a class re-export would only accept an instance from that exact bundled copy; a
  structural type has no identity. A compile-time guard (`DiagnosticsImpl extends Diagnostics`)
  keeps the interface honest. This also **shrinks the build's shared-`Diagnostics`-chunk problem** —
  only the runtime class needs de-duping, not the type.
- The mis-homed `activeProps…selectedProps` re-export was removed from `packages/core/src/utils/`
  (the `core/utils` follow-up — resolved).

**Rule for the `packages/core` re-export entries** (`primitive.ts`, `contract.ts`, `props.ts`,
`state`, `aria.ts`, …): a **cross-workspace** re-export is
`export * from '@praxis-kit/<pkg>/<subpath>'` against a named barrel of the source package — never a
hand-listed set of symbols, which rots silently when the source renames or drops one. Only
**same-package** (`./types`, `./x`) names are listed explicitly (this file sees those change). To
make this work, `lib/primitive` gained `./tag` + `./utils` subpaths and `lib/contract` gained
`./aria/factories`, `./aria/roles`, `./props`, `./types/aria/aria-rule` — each an exact barrel that
already existed. `primitive.ts`'s surface grew to whatever `@praxis-kit/primitive/utils` exports (it
was already all in the bare `@praxis-kit/primitive` surface). The "ARIA-role helpers on the
`primitive` entry despite the filename" follow-up still stands — the _rot_ concern is fixed, but
relocating them to an aria/guards entry is a separate call.

**Deferred** (the actual `v1.0.0` work): `../pk`'s `tsup.config.ts` (~20 per-entry configs, the
shared-`Diagnostics`-chunk scheme, `esbuild-plugin-solid` / svelte handling),
`scripts/postbuild.ts`, the `tsconfig.build-*.json` variants → converted to `tsdown` once all
adapters + the codemod exist; `publint`; the CI release workflow; flipping `private: false` and the
first publish. Two invariants the build must preserve are noted in `packages/kit/README.md` (no
unpublished names in output; single `Diagnostics` identity via a shared chunk).

### `adapters/lit` — port scope and adaptations

Sixth framework adapter, fourth non-React-family one. Lit components are plain custom-element
classes (`LitElement` subclasses), Light DOM only (`createRenderRoot()` returns `this`) — variants,
`as`, and the pipeline's other built-in fields are ordinary HTML attributes, reflected via Lit's
`static properties`, not a props object. `createContractComponent` returns the class itself; callers
register it with `customElements.define()`. Flat `src/`, 22 files, 135 tests (111 jsdom + 24 SSR) —
unchanged from `../pk`'s own count.

Ported from `../pk`'s working tree as of 2026-09-04, including its uncommitted
`ContractProps<T>`/`GenericsOf<T>` addition (not yet committed there) — see below.

- **`package.json`:** same fix as every prior adapter — `../pk` ships a `dist`-pointing `exports`
  map and puts `@praxis-kit/{adapter-utils,core,diagnostics,primitive,contract-props}` in
  `devDependencies` (only `type-fest` as a real dependency); moved all five to real `dependencies`,
  `exports` to `{ ".": "./src/index.ts" }`, dropped `files`/`repository`/`homepage`/`bugs`/
  `license`/`author`/`keywords`/`engines`/per-package `lint` scripts (none of that survives in any
  other adapter here either).
- **No framework-specific `tsconfig.<name>.json` needed** — Lit has zero `.tsx`, so `tsconfig.json`
  extends `../../tsconfig.base.json` directly, the same as Vue's.
- **`vitest.config.ts` needed no adaptation at all** — `../pk`'s already calls the shared
  `defineJsdomConfig('@praxis-kit/lit')` helper from `configs/vitest.base.ts`, which already exists
  here unmodified. (Solid/Svelte bypass that helper only because they need a framework-specific Vite
  plugin its signature doesn't accept; Lit needs none.) `vitest.ssr.config.ts` (raw `defineConfig`,
  `environment: 'node'`) ported unchanged too.
- **`configs/architecture.ts` gap found and fixed — present in `../pk` too, not introduced by this
  port.** Neither `lit` nor `web` (not yet ported) has a `boundaries/elements` entry or a `core`
  disallow-list entry in `../pk`'s copy of this file either — confirmed byte-identical to this
  repo's copy before this change. Every prior port here has fixed this class of gap on sight
  (Solid's port added `solid-js`/`solid-js/**`); added
  `{ type: 'lit', pattern: 'adapters/lit/**/*' }` and `'lit'`/`'lit/**'` to the `core` boundary's
  disallow list.
- **`import-x/no-duplicates` lint gap found and fixed — a real difference from `../pk`, not carried
  over.** `../pk`'s lint passes cleanly on `build-runtime.ts` (`./types/index` imported twice, one
  statement type-only) and `create-contract-component.ts` (`@praxis-kit/core` imported twice,
  `AnyRecord` split into its own statement) — this repo's `eslint.config.ts` enforces
  `import-x/no-duplicates` where `../pk`'s apparently doesn't reach these files the same way. Merged
  both pairs of imports into one statement each; no behavior change.
- **README bug found and fixed:** `../pk`'s Exports table describes `defineContractComponent` as
  "Registers the component as a custom element (from `adapter-utils`)" — wrong on inspection of the
  actual (shared, adapter-agnostic) implementation
  (`lib/adapter-utils/src/runtime/define-component.ts`): it only curries a factory's options
  (`(options) => (factory) => factory(options)`), matching what Solid's and Svelte's READMEs already
  say for the identical shared function. Also replaced the `praxis-kit/lit` subpath-import framing
  (`packages/kit` doesn't wire in `./lit` yet — matching Solid/Svelte's own not-yet-wired state)
  with `@praxis-kit/lit` direct-install framing, and rewrote Usage around the real
  `customElements.define()` pattern, since the original example never showed registration at all.
  Kept (verified accurate, not carried over blind): the "known limitations" block already present in
  `../pk`'s own `conformance.test.ts` header comment (tag polymorphism is ARIA-only; variant
  attributes reach the DOM; `asChild` disabled) — folded into the README's own Usage section rather
  than left undiscoverable in a test file.

**The `ContractProps<T>`/`GenericsOf<T>` mechanism, carried over mid-flight from `../pk`.** Unlike
Svelte's `GenericsOf<T>` (a direct `infer` off `BuiltRuntime<G, TOptions>`, no marker needed — that
adapter's `createContractComponent` returns the bundle type unerased), Lit's
`createContractComponent` erases `TDefault`/`Props`/`TPreset` entirely from its return type
(`LitContractComponent<TVariants, TPluginProps>` only ever carried those two parameters) — there was
no ordinary type parameter left to recover `G` from. `LitContractComponent` gained a third,
defaulted parameter `G` and a phantom `readonly __generics?: G` field, the same marker shape
React's/Preact's `HasGenerics<G>` (`@praxis-kit/contract-props`) uses for their own erased,
overload-based component types — new dependency on that package (already present here, used by
React/Preact). `ContractProps<T>` itself takes no `Mode` parameter, unlike React's/Preact's
`ContractProps<T, Mode>` — Lit has exactly one render mode (no `asChild`/`render`), so there is only
ever one prop shape to recover: the custom props (`PropsOf<G>`) plus variant props plus `recipe`
(`as` is `never` — see below). This was in-progress, not yet committed, in `../pk` at port time (its
reference commit history has no `feat(lit): …ContractProps…` commit) — ported anyway per explicit
direction, rather than deferred to a later sync.

**`as` removed entirely — a design bug inherited from `../pk`, found in review and fixed here, not
merely ported.** `../pk`'s Lit adapter accepted `as` as a _semantic-only_ override: setting `as="a"`
never changed the rendered element (a custom element's tag is fixed at `customElements.define()`
time — nothing can turn a `<praxis-button>` into an `<a>`), but it did change which ARIA/
content-model rules `resolveTag`/`resolveAria`/the children-evaluator applied, as if the element
really were an anchor. Two real problems, not just a naming one:

- **A live accessibility footgun.** `as="a"` could produce `role="link"` (or whatever ARIA state a
  real anchor implies) on an element with none of an anchor's actual keyboard/click/middle-click
  behavior — a role-without-matching-behavior mismatch regardless of what the option was called.
- **SSR disagreed with the client, silently.** `renderBundleToString` (`lib/adapter-utils`, shared
  with the not-yet-ported Web adapter) has no live DOM to constrain it, so it rendered whatever tag
  `as` named as a literal string wrapper: `renderToString(Button, { as: 'a' })` produced
  `<a …>…</a>`, while the browser could only ever produce `<praxis-button>…</praxis-button>`. This
  also quietly contradicted the adapter's own `capabilities.tagPolymorphism: false` in the
  conformance suite — that flag already said Lit has no tag polymorphism; SSR provided a fake,
  DOM-inconsistent form of it anyway.

Fixed by removing `as` from the pipeline entirely, on both paths, rather than renaming it to signal
"semantic-only" (the renamed option would still carry the same footgun): no longer a declared Lit
reactive property (removed from `staticProps`/`InstanceProps`/`praxisProps`); explicitly filtered
out of `_buildProps()`'s attribute scan (so an undeclared, raw `as="…"` HTML attribute is inert too,
not just the removed property); `ContractProps<T>['as']` is now `never`, not
`DefaultOf<GenericsOf<T>>`; `renderToString`'s standalone SSR entry strips an incoming `as` key from
`props` before it reaches the shared `renderBundleToString`. Also fixed the shared testing
infrastructure this exposed: `SsrConformanceAdapter` (`lib/adapter-utils`) had no
`capabilities.tagPolymorphism` gate at all — unlike the DOM-side `ConformanceAdapter`, which already
skips its "as changes the tag" tests when that capability is `false` — so `ssrConformanceSuite`
universally asserted real `as`-driven tag polymorphism with no opt-out. Added the same gate to the
SSR suite (`lib/adapter-utils/src/types/ssr-conformance-adapter.ts`,
`lib/adapter-utils/src/testing/ssr.ts`) and set `capabilities: { tagPolymorphism: false }` on Lit's
`ssrConformanceSuite` call, matching what it already declares for the DOM suite. This is a genuine
gap in the reference implementation too (`../pk` has the identical unconditional SSR test, and the
same `renderToString` behavior) — worth carrying upstream, and directly relevant to Web's eventual
port, which shares `renderBundleToString` and has the identical fixed-tag constraint.

New regression coverage: `ssr.test.ts` asserts `renderToString` output is byte-identical with and
without an `as` key, and that `options.tag` still renders regardless of an unsupported-looking `as`
value; a new `property-attribute-convergence.test.ts` proves every praxis-owned property
(`direction`, `recipe`, `praxisClass`) produces the same pipeline result whether set via
`el.x = 'y'` or `el.setAttribute('x', 'y')` — the client-side test suite previously exercised
attributes almost exclusively — plus a dedicated case confirming `el.as = 'a'` (property assignment)
has zero effect, mirroring the SSR-side fix.

**Noted, not acted on:** the SSR registry's module-local
`WeakMap<LitContractComponent, RegistryEntry>` (`render-to-string.ts`) means a second,
separately-bundled copy of this adapter package would get its own registry, and a class registered
against one copy wouldn't resolve against the other's `renderToString` — a packaging/bundling
concern for whenever `packages/kit` starts assembling these adapters for publish (the same "single
identity across the published graph" invariant already called out for `Diagnostics` in
`packages/kit/README.md`), not an architectural flaw to fix today.

Verification: `pnpm -r typecheck` (23 packages) 0 errors, `pnpm -r test` all packages green
(`adapters/lit` 141/141, up from 135), `pnpm lint:check` clean, `pnpm format:check` clean (no new
drift — the pre-existing 19 flagged files still sit outside everything touched here).

### `adapters/web` — port scope and adaptations

Seventh and final framework adapter — `../pk`'s full adapter set is now ported. A plain
`HTMLElement` subclass, no framework dependency at all (no peer dependency either — "the
zero-framework path"). Architecturally Lit's closest sibling: both are fixed-identity custom
elements sharing `resolveHostState`/`renderBundleToString`/`diffAndApplyAttributes` from
`@praxis-kit/adapter-utils`, and Web's own reactivity is even simpler — no framework runtime at all,
just the native `observedAttributes`/`attributeChangedCallback` lifecycle plus a manual `update()`
escape hatch for anything that isn't an observed attribute. 15 files, 91 tests (63 jsdom, 28 SSR).

Applied the exact `as`-removal design fix from `adapters/lit`'s own port proactively, rather than
porting the bug forward and re-discovering it — `../pk`'s web adapter has the textually identical
issue: `as` was observed (`observedAttrNames`), overlaid into `_buildProps()`
(`self.as ?? this.getAttribute('as')`), and reached `resolveHostState`/`renderBundleToString`
exactly like Lit's did, with the identical two failure modes (a `role`-without-behavior
accessibility footgun, and `renderToString(Button, { as: 'a' })` disagreeing with what the live
`<praxis-button>` could ever render). Fixed the same way: removed from `observedAttrNames`, filtered
out of the raw-attribute scan in `_buildProps()` (so an undeclared `as="…"` attribute is inert too),
and stripped from `props` in the standalone `renderToString()` SSR entry before it reaches the
shared `renderBundleToString`. `ssrConformanceSuite` call gets
`capabilities: { tagPolymorphism: false }`, using the gate added to
`SsrConformanceAdapter`/`ssrConformanceSuite` during the Lit port (`lib/adapter-utils` — no further
changes needed there, this port just consumes it). New `property-attribute-convergence.test.ts` here
differs from Lit's in a genuinely adapter-specific way, not a copy-paste: Web has no declared
reactive-property accessors at all (unlike Lit's `static get properties()`), so a praxis-owned
property set directly (`el.direction = 'row'`) does **not** auto-trigger the pipeline the way
`setAttribute` does — convergence only holds once `.update()` is called explicitly. Both halves are
pinned: convergence after `.update()`, and an explicit test that skipping it leaves the pipeline
stale (a real behavioral difference from Lit worth documenting, not an oversight to paper over).

Other adaptations, same class of fix `adapters/lit` and every prior adapter needed:

- **`package.json`:** `../pk` had `@praxis-kit/primitive` correctly in real `dependencies` already
  (unlike Lit, where every praxis dep was miscategorized) but still had
  `adapter-utils`/`core`/`diagnostics` in `devDependencies` — moved all four to `dependencies`.
  `exports` switched to the source-consumed convention; dropped `files`/`repository`/`homepage`/
  `bugs`/`license`/`author`/`keywords`/`engines`/per-package `lint` scripts, `eslint.config.ts`
  (root-only lint here, like every other adapter).
- **No framework-specific `tsconfig.<name>.json` needed** — zero `.tsx`, so `tsconfig.json` extends
  `../../tsconfig.base.json` directly, same as Vue's and Lit's.
- **`vitest.config.ts` ported with one real detail preserved, not simplified away**: `../pk`'s sets
  `pool: 'forks'` with a comment explaining why (jsdom's `HTMLElement` instances carry circular
  references that overflow Vitest's IPC serializer under the default pool) — kept verbatim, since
  dropping it silently would reintroduce whatever failure it was added to prevent.
- **`configs/architecture.ts` gap found and fixed — present in `../pk` too, same as Lit's.** Added
  `{ type: 'web', pattern: 'adapters/web/**/*' }` to `boundaries/elements`. No `core`-boundary
  disallow-list entry needed for Web specifically (unlike Lit/`lit`, `react`, etc.) — Web imports no
  framework npm package at all, so there's no dependency name to forbid.
- **README bugs found and fixed, both**: same `defineContractComponent` "registers the component as
  a custom element" error Lit's README had (identical shared implementation, identical fix — it only
  curries factory options); and a second, Web-specific one — the README claimed the adapter "Uses
  `@praxis-kit/runtime` for rendering instead of a host framework," but nothing in `package.json` or
  any source file references that package at all. Rewrote around the real, dependency-free
  implementation.

Verification: `pnpm -r typecheck` (24 packages) 0 errors, `pnpm -r test` all packages green
(`adapters/web` 91/91), `pnpm lint:check` clean, `pnpm format:check` clean.

### `adapters/lit` and `adapters/web` — "model vs. host," and `renderToString` renamed

Follow-up to both adapters' `as`-removal fixes, found in review of the finished Web port and applied
retroactively to Lit for consistency (both share the exact same constraint). Two related but
distinct clarifications, not new bugs in the sense `as` was — both are about naming and
documentation catching up to what the architecture has always actually done, not about behavior that
needed to change.

**`options.tag` is a semantic target, not the host tag — now stated as a first-class concept.**
Previously implicit (the `as` doc comments referenced `options.tag` without ever defining what it
means for _these_ two adapters specifically). Made explicit on `createContractComponent`'s own doc
comment and each README's new "What `tag` means" section:

```text
Praxis intrinsic model:  button          (options.tag — drives ARIA/content-model/normalizers)
DOM host:                praxis-button   (customElements.define()'s name — the actual element)
```

`options.tag` is the lookup key into the shared ARIA-role/content-model/prop-normalizer engine
(`@praxis-kit/core`) — it was never the tag written to the DOM for these two adapters, unlike the
five VDOM adapters where `tag`/`as` genuinely is the render target. Once this is explicit,
`disabled` stops being confusing: `<praxis-button disabled>` correctly gets `aria-disabled="true"`
from the `disabledProps` normalizer (the HTML-boolean-attribute handling in `_buildProps()` was
already correct), but the browser doesn't make the custom element keyboard-inert or
form-participating — not a gap in that normalizer, but a direct, unavoidable consequence of
`class X extends HTMLElement` that no ARIA attribute on any element (custom or not) ever closes. The
contract layer (styling, variants, ARIA policy, child enforcement, attribute management, lifecycle
hooks, diagnostics) and the host's real interactive behavior are documented as staying conceptually
separate — a caller needing real button/link/input behavior wires it themselves via `onElement`.
**Customized built-ins** (`class X extends HTMLButtonElement` + `{ extends: 'button' }`, giving
`<button is="praxis-button">` real `HTMLButtonElement` behavior) were considered and explicitly
rejected as the fix: a real platform mechanism, but a different consumer-facing API with its own
platform constraints, not worth the complexity for what's already an honest, documented trade-off
rather than a defect.

**`renderToString` renamed to `renderContractToString`, in both adapters.** Independent of the `as`
fix, a second, more fundamental SSR/DOM difference exists and — unlike `as` — cannot be "fixed" the
way `as` was: `renderBundleToString` (shared, `lib/adapter-utils`) always emits `options.tag` as the
literal wrapper (`<button>…</button>`), never the registered custom-element tag
(`<praxis-button>…</praxis-button>`), because it has no way to know that name —
`customElements.define()` happens externally, after `createContractComponent()` already returned,
possibly under multiple names or never. This is stable and deterministic per component (unlike the
old `as` bug, which made SSR output vary per call for a prop the client ignored entirely), but it
means this output can never be handed to the browser expecting the live custom element to
progressively upgrade over it — the platform's Custom Element upgrade mechanism only fires on an
exact tag-name match, and a server-sent `<button>` can never become `<praxis-button>` no matter what
the client bundle does. Two ways forward were considered:

- Make it truly hydration-safe by having the caller supply the registered element name explicitly,
  emitting that tag instead of `options.tag` when given — real DOM parity, but a genuine API
  expansion (a new parameter threaded through `renderBundleToString`'s shared signature, both
  adapters' `renderToString`, every SSR test and README example).
- Keep emitting `options.tag`, but stop implying this is Custom Element SSR at all — rename and
  redocument it as exactly what it is: serialization of the resolved contract's styling/ARIA/
  attribute pipeline as plain HTML, useful standalone (static generation, snapshot tests, previews),
  no hydration promise.

Took the second path — no architecture change, and it's the framing "model vs. host" above already
implies: the contract layer was never promising to reproduce the live custom element, on the DOM
side or the SSR side. `renderToString` → `renderContractToString` in both `adapters/lit` and
`adapters/web` (exported name, error messages, all doc comments, all test call sites); the shared
`SsrConformanceAdapter`/`ssrConformanceSuite` interface's own `renderToString` property name is
**not** renamed — that property is generic across every adapter (including the five VDOM ones, where
it genuinely does render a hydratable string), so only the two adapter-specific exports changed, not
the shared testing contract. If real Custom Element hydration is wanted later, the first option
above is what it would take — not attempted here.

Also fixed, same class of staleness the `as`/`renderToString` conversation surfaced: both adapters'
`package.json` `description` and README opening lines called them "polymorphic," despite both
explicitly declaring `capabilities: { tagPolymorphism: false, asChild: false }` — reworded to
"Custom Elements with Praxis styling, ARIA contracts, and structural child validation," dropping the
word entirely rather than qualifying it. Lit's README also still listed `as` among the "built-in
fields" reflected as attributes — a leftover from before its removal, fixed.

**Noted, not acted on:** a future Web-specific primitive or plugin supplying real behavioral
semantics for ARIA states that imply interaction (`disabled`, `pressed`, `expanded`, `selected`) —
e.g. wiring actual keyboard handling to match `aria-pressed` — would be a legitimate enhancement,
but it's additive product work on top of the contract/host separation documented here, not a fix to
anything currently wrong.

Verification: `pnpm -r typecheck` (24 packages) 0 errors, `pnpm -r test` all packages green
(`adapters/lit` 141/141, `adapters/web` 91/91 — same counts as before, this is a rename plus
documentation, not a behavior change), `pnpm lint:check` clean, `pnpm format:check` clean.
