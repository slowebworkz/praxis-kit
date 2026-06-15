# Praxis UI — Work Log & Remaining Tasks

---

## Open PRs

### #116 — Playwright CT for React + WAI-ARIA 1.2 audit + shared package hardening

- **Playwright CT (`@playwright/experimental-ct-react`)** — 11 behavioral tests in `packages/react/src/current/interaction.pw.spec.tsx` covering keyboard activation (Space/Enter), focus management, axe WCAG sweeps, live-region `aria-live` injection, and tag polymorphism. Components extracted to a fixtures file (`interaction.pw.fixtures.tsx`) per CT import requirement. Vite aliases use array-form with sub-entries before roots and regex for deep paths to avoid prefix-matching collisions. Axe tests scoped to the mounted component via `sweepAxeLocator` to avoid the `page-has-heading-one` rule.
- **WAI-ARIA 1.2 complete concrete roles** — `KNOWN_ARIA_ROLES` expanded from 19 to all 81 non-abstract WAI-ARIA 1.2 roles (`directory` excluded as deprecated). `KNOWN_ARIA_ROLES_SET` added. Fixed a silent role-stripping bug: `render.ts` dropped roles not in the list before `AriaPolicyEngine` saw them.
- **WAI-ARIA states and properties audit** — `GLOBAL_ARIA_ATTRIBUTES` (17 true-global attributes) and `ROLE_RESTRICTED_ATTRIBUTES` (28 attributes with their allowed roles) extracted into `constants/aria/`. Dropped deprecated `aria-dropeffect`/`aria-grabbed` and corrected `aria-posinset`/`aria-setsize` to role-restricted.
- **Shared package reorganization** — `constants/` now exports only runtime values; types moved to `types/`; guards contain only type-predicate functions. All non-foundational guards switched from barrel imports to direct file imports (`../foundational/is-string` etc.) and raw `typeof`/`=== undefined` checks replaced with `isString`, `isUndefined`, `isDefined`, etc.
- **Circular dependency fix** — `KnownAriaRole` type moved into `constants/aria/known-aria-roles.ts` (alongside its source array) so `types/` no longer imports from `constants/`. `IntrinsicTag` satisfies-clause removed from `constants/aria/implicit-role-record.ts`, cutting the `constants→types` back-edge that closed the cycle. `playwright/.cache/` excluded from dependency-cruiser scan.

---

## Recently Shipped

### #110 — `aria-live`, `aria-atomic`, `aria-relevant` enforcement

Three new rules added to `AriaPolicyEngine` in `lib/contract`:

- **`#checkMissingLiveRegion`** — injects the WAI-ARIA implied `aria-live` value (`assertive`/`polite`/`off`) when a live-region role (`alert`, `status`, `log`, `timer`) is present without it. Fires for both semantically implicit cases and explicit role assignments on neutral tags (e.g. `<div role="alert">`). Fixable, `'warning'` severity.
- **`#checkMissingAtomic`** — advisory warning when `aria-atomic` is absent on a live region. Not fixable — the correct value depends on content structure, not role alone.
- **`#checkInvalidAriaRelevant`** — validates `aria-relevant` tokens against the WAI-ARIA permitted set (`additions`, `removals`, `text`, `all`) and normalises `"all + others"` → `"all"` since `all` supersedes the other tokens. Fixable.

Also fixed a correctness bug in the fix-plan cache: `AriaPlan.additions` only captured new keys, not value changes. Renamed to `AriaPlan.updates` and now captures `inputProps[key] !== resultProps[key]` — a cache hit after `aria-relevant` normalisation previously replayed with an empty updates map and silently lost the normalised value.

gzip cost: ~760 B across all ARIA-bearing scenarios. Snapshot baselines updated.

### #109 — `@praxis-ui/shared` package

Consolidated all shared types, guards, and constants that were previously duplicated across `lib/` and `packages/core` into a new publishable `packages/shared` package.

- **Types** — organized under explicit subfolders: `types/primitives/`, `types/variants/compound/`, `types/pipeline/`, `types/class/`, `types/aria-rule/`, `types/factory/`, `types/polymorphic-runtime/`
- **Guards** — `guards/foundational/`, `guards/aria/`, `guards/contract/`, `guards/variants/`, `guards/primitive/`, `guards/capabilities/`
- **Constants** — `constants/aria/`, `constants/primitive/`
- Original definition sites in `lib/contract`, `lib/styling`, `lib/primitive`, and `packages/core` become hybrid redirects — re-export from `@praxis-ui/shared` so all existing import paths remain valid
- `lib/primitive` retains its own implementations (bottom-layer rule: no imports from `packages/`)

### #108 — README restructure

Split monolithic README into `README.md` (overview + quick-start) and `GETTING_STARTED.md` (detailed setup). Reverted license to MIT.

### #107 — Publish readiness (v3.0.1)

All 13 publishable packages are now npm-ready:

- **Bundle fix** — `core` now inlines `primitive`/`contract`/`styling` via `noExternal` + tsconfig `paths`; adapters inline `adapter-utils`. Private libs moved to `devDependencies` so they don't appear in published manifests.
- **Version** — all packages bumped to `3.0.1` (first published release, aligned to `v3.0.0` tag lineage).
- **npm metadata** — `publishConfig`, `repository`, `homepage`, `bugs`, `author`, `description`, `keywords`, `sideEffects`, and `LICENSE` in `files` added across all packages.
- **License** — replaced MIT with PolyForm Strict 1.0.0; copyright K Huehn <slowebworkz@gmail.com>.

### #104 — `async-warn` for Tailwind pipeline warnings

`warnReservedLayoutLiterals` and `warnDeadVariants` now respect `'async-warn'` mode via batched `queueMicrotask`. The `flex`+`grid` mutual-exclusion warning in `resolveLayout()` intentionally stays synchronous (call-site misconfiguration, not a render violation). `_resetPipelineWarns()` exported for test isolation.

### #103 — Lit: selective `updated()` guard via `requestUpdate` override

`_applyPraxis()` previously ran on every Lit update regardless of cause. Override intercepts at the scheduling site — sets `_praxisDirty = true` only when `name === undefined` (manual call / initial connection) or name is a praxis-owned key. Non-praxis subclass property changes no longer trigger the pipeline. `_praxisDirty` initializes `true` so the first render always runs.

### #102 — `resolveAdapterCommonOptions` centralization

Extracted the repeated `name`/`strict` resolution from all six adapter `normalizeOptions()` functions into `@praxis-ui/adapter-utils`. `AdapterDefaults` type exported. Lit uses `resolveAdapterCommonOptions(options, 'PolymorphicElement', false)`.

### #101 — Expanded `validate-render-props` tests + `async-warn` coverage

15 tests in `validate-render-props.test.ts` (up from 10): cross-component dedup isolation, early-return regression guard, throw-mode precedence, numeric type bypass, 8 `async-warn` cases. 2 new in `validate-factory-options.test.ts`. Shared `beforeEach` spy setup.

### #100 — `'async-warn'` StrictMode value

Fourth `StrictMode` value. Defers `console.warn` via `queueMicrotask`; batched flush; per-tick dedup. Applied in `StrictBase.warn()` and `validate-render-props`. `validate-factory-options` stays synchronous (construction-time, one-shot).

### #99 — Lit SSR via `renderToString`

`renderToString(component, props, innerHTML?)` builds HTML directly from the praxis-ui pipeline — no `@lit-labs/ssr` dependency. Tag polymorphism works in SSR. `registerForSsr()` stores `LooseBundle` in a `WeakMap`. `ssrConformanceSuite` passes with no capability flags. `capabilities.ssr: true`.

### #106 — `@praxis-ui/web` adapter

Framework-free vanilla Custom Elements adapter. Same four-layer `buildRuntime` pattern as Lit. `createContractComponent()` returns a plain `HTMLElement` subclass; `renderToString()` handles SSR via `WeakMap`. `BuiltRuntime` now carries `strict`, exposed as a static on the returned class so subclasses can route enforcement through `warn`/`async-warn`/`throw`. Fixed infinite-recursion bug where user-added observed attributes leaked into `state.attributes` and re-triggered `attributeChangedCallback`.

`examples/web`: Box, Button, and interactive Tabs (context-attribute pattern, WAI-ARIA keyboard nav, controlled mode, 45 tests).

### #98 — `examples/lit`

Box (direction/align/gap variants, row/stack presets), Button (intent/size, cta/subtle presets, filterProps), Tabs (children enforcement). 22 tests. No Vite app — no JSX transform needed.

### #97 — Lit typed instance properties

`_self` private getter encapsulates `this as unknown as InstanceProps` cast at the class boundary. `LitContractComponent<TVariants>` return type resolves TS4094.

### #96 — `@praxis-ui/lit` adapter

Full four-layer pattern: `normalizeOptions` → `buildCoreRuntime` → `buildEngines` → `composeFilter`. Light DOM, no decorators, `praxis-class` attribute for circular-loop avoidance, `_pipelineAttrs` Set for stale attribute tracking, `isLooseBundle` structural validator. Conformance: 50/56 with `tagPolymorphism: false` and `domPropFiltering: false`.

---

## Remaining Work

### Next — `praxis-kit` distribution package (`feat/kit-package-distribution`)

Single-entry-point distribution package. Consumers install `praxis-kit` and import any adapter or tool via sub-entry — no separate npm packages to install. Reduces publish pipeline to one package.

- [x] Move `packages/{react,preact,solid,svelte,vue,lit,web}` → `adapters/{react,preact,solid,svelte,vue,lit,web}`
- [x] Add `adapters/*` to `pnpm-workspace.yaml`
- [x] Update `CLAUDE.md` repo overview (three workspace roots: `packages/`, `lib/`, `adapters/`)
- [ ] Create `packages/kit/` — `package.json` (name: `praxis-kit`), `tsup.config.ts`, `tsconfig.json`
- [ ] Wire kit build: array of tsup configs pointing at sources in `adapters/` and `packages/`
- [ ] Verify all sub-entries build and typecheck (`pnpm --filter praxis-kit build && typecheck`)
- [ ] Add codemod migration: `@praxis-kit/{react,preact,...}` → `praxis-kit/{react,preact,...}`
- [ ] Update `publish.yml` to publish `packages/kit` only
- [ ] Publish `praxis-kit` to npm
- [ ] `npm deprecate` individual adapter packages on npm

### Deferred (still pending)

- **`normalizeOptions` centralization** — shipped as `resolveAdapterCommonOptions` (#102) ✅
- **Selective `updated()` guard** — shipped (#103) ✅
- **`async-warn` for Tailwind** — shipped (#104) ✅
- **Conformance performance/isolation suites** — shipped (#105) ✅
- **`@praxis-ui/shared` package** — shipped (#109) ✅

### Architecturally Deferred (scoped decisions — not forgotten)

- **Cross-file static composition in `staticCompositionPlugin`** — currently rewrites same-file usage sites only. Cross-file composition requires traversing the Vite module graph. Deferral boundary documented in plugin source.
- **Dynamic children analysis in `contractPlugin`** — validates cardinality for statically-analyzable JSX only; computed children (mapped arrays, conditionals, spread) are skipped silently. Requires a broader data-flow pass.
- **`styling.presets` → `styling.recipes` rename** — directionally decided, not yet released. Aligns with Chakra UI / Stitches / Tailwind Labs terminology. Codemod will automate migration when shipped.

---

## Architectural Constraints (documented, not bugs)

### Web adapter

- **Tag-name coupling in child guards** — `createElementGuard('example-tabs-trigger')` breaks if the component is registered under a different name. A Symbol-based contract marker (`Trigger.contract = Symbol.for('praxis:TabsTrigger')`) + `hasContract(sym)` predicate would decouple enforcement from the registration name. Requires library-level support in `createContractComponent`.
- **Cached descendants** — `Root.setActiveValue` calls `querySelectorAll` on every selection. For large compound components (Accordion, TreeView, Menu) this will matter. Solution: cache trigger/panel lists in `connectedCallback`, invalidated by `MutationObserver` or `slotchange`.
- **State owned by descendants** — currently Root writes `dataset.state`/`hidden` directly onto children. When animation/transitions arrive, `trigger.setActive(value)` / `content.show()` would let each descendant own its own state representation.
- **`aria-controls` / `aria-labelledby` wiring** — roles are present (`tab`, `tabpanel`, `tablist`) but the panel linkage is missing. Root could auto-generate stable IDs from the `value` attribute.

### Lit adapter

- **Tag polymorphism** — custom element tags fixed at `customElements.define()` time; `options.tag` and `as` drive ARIA inference only
- **Variant key DOM attributes** — Lit's reactive property system keeps variant attrs on the host; removing them creates a feedback loop
- **asChild** — no JSX slot merge in Light DOM; `capabilities.asChild: false`

### `async-warn` module-global queue

`pendingAsyncWarns` is module-global in `StrictBase`, `validate-render-props`, and `create-tailwind-pipeline`. This is intentional — duplicate warnings from the same violation across two render calls in the same tick are suppressed. Per-instance queues would defeat the dedup purpose.

---

## Appendix — Feature Expansion

### Runtime feature candidates

These were evaluated against the current architecture for fit, cost, and layer correctness. See the performance/size estimates below each entry.

| Feature | gzip addition | Per-render cost | Status |
|---|---|---|---|
| `aria-live` enforcement | ~760 B gzip | none (cache hits) | ✅ Shipped (#110) |
| Keyboard contracts (advisory) | ~600 B | none | Candidate — marginal |
| Media query variant defaults | ~500 B | Map lookup | Deferred — SSR risk |
| Focus management (static, factory-time) | ~600 B | none | Deferred — better in ESLint plugin |
| Focus management (runtime, MutationObserver) | ~2 KB | observer × N components | Deferred — wrong layer |
| Keyboard contracts (behavioral enforcement) | — | — | Deferred — wrong layer |

---

#### `aria-live` enforcement — ✅ **Shipped (#110)**

Three rules added to `AriaPolicyEngine.#pipeline` in `lib/contract/src/aria/polymorphic-validator.ts`. All cap at `'warning'` severity and route through `warn()`, not `violate()`.

1. **`#checkMissingLiveRegion`** — injects the role-implied `aria-live` value when absent. `alert`→`assertive`, `status`→`polite`, `log`→`polite`, `timer`→`off`. Fires for explicit live-region roles on any tag (not just those with a matching implicit role). Fixable.
2. **`#checkMissingAtomic`** — advisory warning when `aria-atomic` is absent. Not fixable — correct value is content-structure-dependent.
3. **`#checkInvalidAriaRelevant`** — validates tokens against the WAI-ARIA permitted set; normalises `"all + others"` → `"all"`. Fixable.

Actual gzip cost: ~760 B (estimate was ~400 B — the cache correctness fix and `AriaPlan.updates` rename account for the difference).

---

#### Keyboard contracts (advisory) — **candidate, marginal**

Declare the expected key→action map for a compound component (`{ ArrowDown: 'focusNext', Escape: 'dismiss' }`). Factory-time validation warns if `onKeyDown` is absent when a keyboard contract is declared. Does not verify behavioral correctness.

- **Size**: ~600 B gzip
- **Perf**: zero — one-time check in `validateFactoryOptions`, not per-render
- **Complexity**: medium for the schema, weak enforcement story. Can only verify that a handler _exists_, not that it does the right thing. Behavioral enforcement belongs in Playwright tests.
- **Why marginal**: useful as documentation and advisory. The warning (`"you declared ArrowDown handling but onKeyDown is missing"`) has real value for design system consumers. But it's closer to a lint rule than a runtime contract.

---

#### Media query variant defaults — **deferred (SSR risk)**

Make variant defaults environment-aware — `motion` variant defaults to `'reduced'` when `prefers-reduced-motion: reduce` matches. Implemented as a singleton `MediaQueryList` subscriber that caches results; per-render cost is a single Map lookup after initialization.

- **Size**: ~500 B gzip
- **Perf**: acceptable — singleton registers one listener per query; Map lookup per render
- **Complexity**: medium. `window.matchMedia` doesn't exist in SSR. Every adapter's SSR path (Lit `renderToString`, Web `renderToString`, React/Vue server rendering) would need to either skip these defaults or accept a server-side hint. This is a new cross-cutting concern that touches every adapter — can't be an afterthought.
- **Why deferred**: the SSR problem isn't hard to solve in isolation, but it requires a coordinated change across every adapter. Worth revisiting when SSR coverage is more complete and there's a clear convention for injecting server-side media state.

---

#### Focus management (static, factory-time) — **deferred (better in ESLint plugin)**

Enforce at factory time that compound components declare their tabindex strategy and that the declared cardinality is structurally valid (e.g. a roving tabindex component must have at least one child with `tabIndex={0}`).

- **Size**: ~600 B gzip
- **Perf**: zero — factory-time only
- **Complexity**: medium. Focus state is application state — it changes on every arrow key press. Static enforcement can only check the _declaration_, not the runtime invariant.
- **Why deferred**: the static form is tractable but weak. The useful check ("at runtime, exactly one child has `tabIndex={0}`") requires observing the DOM across renders, which belongs in the ESLint plugin's static analysis or in a test helper, not a render-time library.

---

#### Focus management (runtime) — **deferred (wrong layer)**

A `MutationObserver`-based engine that validates tabindex state after every interaction.

- **Size**: ~2 KB gzip
- **Perf**: `MutationObserver` per compound component instance. On a page with 20 Tabs/Accordions, 20 observers firing on every interaction. Measurable regression.
- **Why deferred**: wrong layer entirely. Runtime DOM observation is testing infrastructure (Playwright, Testing Library), not a render-time enforcement contract. Adds ongoing overhead in production unless gated behind `strict` mode.

---

#### Keyboard contracts (behavioral) — **deferred (wrong layer)**

Verify that declared keyboard handlers actually produce the correct focus/selection outcomes.

- **Why deferred**: not feasible at this layer. Behavioral verification requires event simulation and DOM inspection — that's an integration test, not a factory contract. Belongs in the conformance test suite (`conformanceSuite`), not the runtime.

---

## Appendix — Future Adapter Expansion

| Priority | Adapter | Status |
|----------|---------|--------|
| A1 | `@praxis-ui/lit` | ✅ Shipped (PRs #96–#99, #103) |
| A1 | `@praxis-ui/web` | ✅ Shipped (PR #106) |
| A2 | `@praxis-ui/angular` | Deferred — see below |
| A2 | `@praxis-ui/ember` | Deferred — see below |
| A3 | Storybook integration | Research complete — see below |
| A3 | Visual conformance (Playwright) | Research complete — see below |

---

## Research: Storybook Integration

_Branch: `research/storybook-integration` — findings documented here for historical accuracy._

### Decision: deferred, approach is clear

Storybook integration is architecturally viable but operationally heavy. The research surfaced one hard constraint and one required factory change. Neither is a blocker — both have a clear path. Deferring until there is concrete consumer demand.

### Hard constraint: one Storybook per framework

Storybook does not support mixing renderers in a single instance (GitHub issue #3889, open since 2019, still unresolved at Storybook 8.x). The answer is **Storybook Composition**: run one Storybook per framework adapter, nominate a host, and declare `refs` in `.storybook/main.ts`. The host's sidebar aggregates all instances; clicking a story swaps the iframe to the correct renderer.

For praxis-ui that means up to 7 Storybook instances (react, preact, vue, solid, svelte, lit, web). The host itself needs no stories — it only wires refs. **Recommended start**: React + Vue, compose the rest incrementally.

**Target version**: Storybook 8.3+. Storybook 9 was in preview as of early 2026 and not stable enough to target as primary.

### Package shape

| Item | Location | Effort |
|---|---|---|
| `@praxis-ui/storybook` addon | `packages/storybook` | ~1–2 weeks for MVP |
| Per-framework Storybook config | `apps/storybook-<fw>/` | Low per instance once templated |
| Composition host | `apps/storybook/` | Trivial |

The addon (`@praxis-ui/storybook`) is a standard Storybook 8 addon using `@storybook/manager-api` + `@storybook/preview-api`. It lives in `packages/` and is consumed by each per-framework Storybook config. MVP scope:

1. **argTypes decorator** — reads the factory's variant schema and injects `select`/`inline-radio` controls automatically. Requires a narrow factory addition (see below).
2. **Enforcement panel tab** — captures `warn()` / `violate()` output during render and displays it in a dedicated panel, mirroring `@storybook/addon-a11y`'s pattern with axe violations.

Non-MVP (follow-on): slot validator badge, per-story cardinality summary, `as`-prop tag-selector control.

### Required factory addition: `__variantDef` export

`react-docgen` resolves CVA variant unions to `string` — it will not produce useful `select` controls automatically. The addon's argTypes decorator needs to read the variant schema at runtime.

The factory (`createContractComponent`) needs to attach the variant definition to the returned component under a well-known symbol:

```ts
const VARIANT_DEF = Symbol.for('praxis-ui.variantDef')
// on the returned component:
Component[VARIANT_DEF] = variantSchema
```

The addon reads `Component[VARIANT_DEF]` and maps each variant key to a Storybook argType. This is a one-line addition to the factory; no public API change.

### CSF3 story shape

```ts
// Button.stories.ts (inside apps/storybook-react)
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@acme/components'

const meta = {
  component: Button,
  // argTypes injected automatically by @praxis-ui/storybook decorator
  // if __variantDef is present; otherwise define manually:
  argTypes: {
    size:   { control: 'select', options: ['sm', 'md', 'lg'] },
    intent: { control: 'inline-radio', options: ['primary', 'ghost', 'danger'] },
    as:     { control: 'text' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = { args: { intent: 'primary', size: 'md' } }
```

### Known limitation: `as`-prop controls are static

Storybook has no first-class API for argTypes that react to other arg values. When a user changes `as` from `"button"` to `"a"`, the controls panel will not automatically add `href`/`target`. Workaround: define per-tag story variants (`ButtonAsAnchor`, `ButtonAsDiv`). A `storybook-addon-dynamic-args` approach (calling `updateArgs` from a decorator) exists but is bespoke and brittle — not recommended.

### Closest prior art

- **`@storybook/addon-a11y`** — direct model for the enforcement panel (runs axe post-render, posts to addon channel, renders in panel tab).
- **Nx Storybook Composition guides** — reference for the multi-instance setup.
- **`storybook-addon-designs`** — panel tab pattern.

### Next steps (not yet scheduled)

1. Add `__variantDef` symbol export to `createContractComponent` in `lib/contract`.
2. Scaffold `packages/storybook` as a minimal Storybook addon (argTypes decorator only, no panel yet).
3. Create `apps/storybook-react` using the React adapter + the new addon; verify CVA controls appear.
4. Add `apps/storybook` composition host pointing at `storybook-react`.
5. Extend to Vue, then compose incrementally.

---

## Research: Playwright Integration

_Branch: `research/playwright-integration` — findings documented here. Implementation deferred pending adapter stabilization._

### Decision: deferred, architecture is clear

Playwright Component Testing is the right second tier for praxis-ui's test system. The approach, package shape, and CI split are all settled. Deferring implementation until the adapter set is stable enough to justify the per-adapter setup cost.

### Architecture: two-tier test system

| Tier | Tool | When | Covers |
|------|------|------|--------|
| 1 — Unit | vitest `conformanceSuite` | Every push | Capability flags, render output, prop contract, TypeScript, gzip |
| 2 — Behavioral | Playwright CT `interactionSuite` | PR + merge-to-main | Keyboard nav, focus management, live region DOM updates, axe WCAG sweep |

The two tiers do not duplicate. vitest runs in jsdom (~fast); Playwright runs in a real browser (~3–4 min on a 4-worker CI runner across all adapters). The behavioral tier only catches things jsdom structurally cannot — real focus, real DOM mutation timing, real computed accessibility tree.

### `@playwright/experimental-ct-*` maturity

The "experimental" label is a branding artifact. The API has been stable since Playwright 1.35 (mid-2023) with no breaking changes. Official packages exist for all primary adapters:

| Adapter | CT package |
|---------|-----------|
| React | `@playwright/experimental-ct-react` |
| Vue | `@playwright/experimental-ct-vue` |
| Svelte | `@playwright/experimental-ct-svelte` |
| Solid | `@playwright/experimental-ct-solid` |
| Preact | Via React CT (compatibility layer) |
| Lit / Web | No official CT package — use Vitest Browser Mode |

### Package shape: `@praxis-ui/playwright`

One package in `packages/playwright`. Provides shared helpers consumed by each adapter's `*.pw.spec.ts` files:

- **ARIA snapshot assertions** — wraps `expect(locator).toMatchAriaSnapshot()` (stable since Playwright 1.59) to assert the browser's computed accessibility role tree. Complements `AriaPolicyEngine` runtime warnings — the engine fires at factory/render time, this asserts the actual browser DOM outcome.
- **Variant class assertion** — `expect(locator).toHaveClass(resolvedClasses)` to verify the CVA class pipeline survives framework serialization.
- **Tag polymorphism checks** — `locator.evaluate(el => el.tagName)` to verify `as="a"` produces `<a>` not `<button>` in the real DOM.
- **Slot cardinality smoke tests** — render intentionally mis-populated slot trees and assert `ChildrenEvaluator` warnings appear in the browser console (intercepted via `page.on('console', ...)`).
- **Keyboard sequences** — `Tab`, `Enter`, `Space`, `Escape`, `ArrowDown/Up` sequences with focus assertions. The only thing unit tests genuinely cannot cover.
- **Axe wrapper** — `checkA11y()` from `@axe-core/playwright` as a single sweep per test. Catches WCAG violations (color contrast, missing labels, landmark structure) that `AriaPolicyEngine` does not model.

### Axe vs. `AriaPolicyEngine` — complementary, not redundant

- `AriaPolicyEngine` enforces praxis-ui's own authored contracts at factory/render time — knows about slot contracts, live-region injection, `aria-relevant` normalization.
- `@axe-core/playwright` runs WCAG rule checks against the live DOM — catches color contrast, missing input labels, cross-component context violations.

They share no rules. Run axe at the end of each CT test as a sweep; praxis-ui helper assertions are the primary assertions.

### Multi-framework setup

Each framework adapter needs its own `playwright-ct.config.ts` (one Vite dev server per framework). No single config can mount React and Vue components in the same run. Orchestrated from a root-level `playwright.workspace.ts` — the same pattern as the existing `vitest.workspace.ts`. One CI command, one shard matrix, separate configs per adapter.

### Lit and Web Components

No official `@playwright/experimental-ct-lit`. These adapters use standard Playwright E2E tests against a served page, or **Vitest Browser Mode** (least friction given the existing vitest investment — shares the vitest workspace config and browser binaries).

### Known limitations

- Cannot test SSR output — covered elsewhere.
- Cannot test tree-shaking or gzip — covered by existing CI check.
- Cannot test TypeScript type errors or `ts-plugin` diagnostics — vitest's domain.
- `aria-live` announcements are observable as DOM mutations, not as actual screen reader speech. No automated tool tests AT speech without NVDA/VoiceOver. Playwright covers the DOM side only.

### Next steps

1. ✅ Scaffold `packages/playwright` with ARIA snapshot, axe, and keyboard helpers — shipped in PR #116.
2. ✅ Add `playwright-ct.config.ts` to `@praxis-ui/react` and write the first interaction suite (Button + focus, keyboard activation, axe sweep) — shipped in PR #116.
3. ✅ Wire `playwright.workspace.ts` at repo root — shipped in `feat/playwright-ct-adapters`. React and Vue CT now orchestrated together; Svelte/Solid blocked pending upstream version compatibility.
4. ✅ Add `playwright-ct.config.ts` to `@praxis-ui/vue` and write the Vue interaction suite (13 tests: polymorphism, keyboard activation, anchor Enter, aria-live injection, axe + aria-labelledby sweep) — shipped in `feat/playwright-ct-adapters`.
5. Extend to Solid, Svelte in sequence (blocked: `@playwright/experimental-ct-svelte` and `@playwright/experimental-ct-solid` lag upstream — incompatible with `playwright-core@1.60.x`).
6. Decide on Vitest Browser Mode vs. standard E2E for Lit/Web.

---

## Research: `@praxis-ui/angular` Adapter

_Branch: `research/angular-adapter` — findings documented here for historical accuracy. Full adapter deferred indefinitely._

### Decision: deferred

Angular's template-first model conflicts with the praxis-ui pattern at the render layer. Every other adapter gets tag polymorphism and `asChild` for free via a functional render primitive (`h()`, `jsx()`, `createElement()`). Angular has no equivalent — a bespoke `PraxisTagDirective` would be required just to approximate what a single `createElement()` call provides elsewhere. The resulting adapter would be more code, less capable (`asChild: false`, limited tag polymorphism), and more burdensome on consumers than any existing adapter.

Audience mismatch is a further factor: Angular teams typically adopt established component libraries (Angular Material, PrimeNG, CDK) rather than low-level polymorphic primitives.

**If Angular demand materializes**: ship a thin `@praxis-ui/angular` package exposing the runtime utilities only (`buildCoreRuntime`, `buildEngines`, `composeFilter`, ARIA engine) so teams can wire their own templates against the praxis runtime. A full `createAngularComponent()` factory is a follow-on, not a starting point.

### Minimum target version

**Angular 16+** — signals API (`signal()`, `computed()`, `effect()`) is stable and integrated into change detection. Angular 17+ is preferred (standalone components are the default, signals fully production-ready). Angular 14–15 would require RxJS as the reactive layer instead of native signals.

### Four-layer mapping

The existing adapter pattern maps to Angular with the following substitutions:

| Praxis layer | React/Vue equivalent | Angular equivalent |
|---|---|---|
| `normalizeOptions` | Plain function | Plain function (no change) |
| `buildCoreRuntime` | `createPolymorphic()` | `createPolymorphic()` (no change) |
| `buildEngines` | `SlotValidator`, `AriaPolicyEngine` | Same — framework-agnostic |
| `composeFilter` | `composeFilter()` | `composeFilter()` (no change) |

The runtime layer is framework-agnostic; the friction is entirely in the **render layer**.

### Tag polymorphism (`as` prop)

Angular has no native equivalent to a dynamic intrinsic tag. Options:

1. **`NgComponentOutlet` directive** — works for component types, not string tag names.
2. **Structural directive `*praxisTag`** — a custom directive that renders one of N pre-declared `<ng-template>` branches based on the tag string. Feasible for the common tags (`div`, `span`, `a`, `button`, `p`, `h1`–`h6`); exotic tags need a fallback branch.
3. **`ViewContainerRef.createEmbeddedView()`** — programmatic template selection; avoids `*ngIf` branching but requires a template anchor in the host.

**Recommendation**: A `PraxisTagDirective` structural directive that maintains a static map of `IntrinsicTag → TemplateRef` and selects at render time. Covers ~90% of real usage. Exotic or custom-element tags fall back to a `<div>`.

### `asChild` (prop merge onto child)

Not idiomatic in Angular's template model. The closest pattern is an **attribute directive** placed on the child that pulls praxis props from a context/injection token set by the parent. This requires a two-step setup:

```ts
// Parent sets context
@Component({ providers: [PraxisSlotContext] })
class ButtonComponent { ... }

// Child reads it
@Directive({ selector: '[praxisSlot]' })
class PraxisSlotDirective {
  constructor(private ctx: PraxisSlotContext, private el: ElementRef) {
    effect(() => applyMergedProps(this.el.nativeElement, ctx.props()))
  }
}
```

**Recommendation**: Ship `asChild` as `capabilities.asChild: false` initially (same as Lit). Document the `praxisSlot` directive as the Angular idiom for the same result.

### Ref forwarding

Angular injects `ElementRef` into the component constructor. Forwarding to a parent uses a template variable (`#myBtn`) or a public `@Output()` emitting the `ElementRef`. No `forwardRef` wrapper is needed — the host element is always accessible via DI.

For the adapter's internal slot protocol (inspecting child refs to determine slot targets), `ContentChild(ElementRef)` or `ContentChildren` with a `PraxisSlot` token provides the equivalent of React's `element.props.ref` / `element.ref`.

### Reactive variant classes (change detection)

Angular signals integrate cleanly:

```ts
protected readonly resolvedClass = computed(() =>
  runtime.resolveClasses(this.tag(), this.mergedProps(), this.className(), this.variantKey())
)
```

`[class]="resolvedClass()"` in the template re-evaluates whenever any signal dependency changes. Requires `ChangeDetectionStrategy.OnPush` to avoid zone-based re-renders on unrelated events.

### ARIA enforcement

`AriaPolicyEngine` and `ChildrenEvaluator` are framework-agnostic. They can run in `ngOnInit` / `ngOnChanges` or inside a signal `effect()`. No special Angular integration needed.

### Key friction points (known before implementation)

- **No functional render function** — Angular is template-first. Unlike Vue/Solid/React, there is no `h()` / `jsx()` escape hatch to build elements imperatively in TypeScript. Every rendering path requires a template.
- **Tag polymorphism requires template branching** — the `*praxisTag` directive is bespoke infrastructure that other adapters don't need.
- **`asChild` is fundamentally incompatible** with Angular's template ownership model; the `praxisSlot` directive workaround is more verbose than other frameworks.
- **Decorator + DI boilerplate** — every component is a class with decorators. The `createContractComponent()` factory returns a class rather than a function, which is consistent with Angular's model but differs from the React/Vue/Solid API shape.
- **`exactOptionalPropertyTypes`** — Angular's generated code and some library types may conflict; needs validation.

### Proposed API shape

```ts
// consumers write:
@Component({
  selector: 'app-button',
  template: `<ng-container *praxisTag="tag(); let T">
    <T [class]="resolvedClass()" v-bind="filteredProps()">
      <ng-content />
    </T>
  </ng-container>`,
})
class ButtonComponent extends createAngularComponent({
  tag: 'button',
  name: 'Button',
  defaults: { type: 'button' },
  styling: { base: 'btn', variants: { size: { sm: 'btn--sm' } } },
  enforcement: { strict: 'warn', aria: [...] },
}) {}
```

`createAngularComponent()` returns a base class with signal inputs (`tag`, `as`, `asChild`, variant props) and computed signals (`resolvedClass`, `filteredProps`, `mergedProps`) wired to the praxis runtime. The template is provided by the subclass.

### Next steps (not yet scheduled)

1. Prototype `PraxisTagDirective` — confirm structural directive can swap intrinsic tags without zone churn.
2. Validate `exactOptionalPropertyTypes` compatibility with Angular compiler output.
3. Build a minimal `Box` component (no `asChild`, no children enforcement) to confirm the base class + signal pattern compiles and renders.
4. Benchmark change detection overhead vs. `ChangeDetectionStrategy.Default` baseline.

---

## Research: `@praxis-ui/ember` Adapter

_Branch: `research/framework-adapters` — findings documented here for historical accuracy. Full adapter deferred indefinitely._

### Decision: deferred

Ember's situation is worse than Angular. Where Angular at least has a programmatic path (`createComponent()`, signals, DI) that could be adapted, Ember is **purely template-driven with no `h()` escape hatch**. Every render path flows through Handlebars/Glimmer templates and the Glimmer VM. There is no equivalent to `createElement()`, `h()`, or `jsx()` — the core primitive the praxis-ui adapter pattern depends on.

The three blockers are fundamental, not implementation details:

1. **No dynamic tag polymorphism** — Glimmer components have a fixed tag. `as` prop would require conditional `{{#if}}` blocks for every possible tag, all declared statically in a template.
2. **No `asChild`** — cross-component prop spreading is non-standard. Yield + hash patterns (`{{yield (hash trigger=(component ...))}}`) are the idiomatic substitute but require consumers to opt in explicitly, not pass a single `asChild` prop.
3. **Factory composition is not idiomatic** — Ember's model is template-declaration-first. Engines and runtimes composed in JavaScript don't integrate naturally; the Ember idiom is services + helpers, not a `buildRuntime()` factory handed into a render function.

**Ecosystem trajectory** further reduces priority: Ember peaked around 2015–2018 and now has a stable but niche enterprise footprint (Bloomberg, LinkedIn, Heroku). Few teams are starting new Ember projects; the community is in maintenance mode.

**If Ember support is ever needed**: same approach as Angular — expose runtime utilities only (`buildCoreRuntime`, `buildEngines`, `composeFilter`) as a helper package, let Ember teams wire their own templates. A full `createEmberComponent()` factory is not a realistic goal given the template-first constraint.
