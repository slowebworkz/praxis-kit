# Praxis UI — Work Log & Remaining Tasks

---

## Open PRs

| PR | Branch | Description |
|----|--------|-------------|
| #105 | `feat/conformance-perf-bundle-suites` | `conformancePerformanceSuite` + `conformanceIsolationSuite` — wired into all 6 adapters; React/Preact conformance adapter per-render isolation fix |
| #106 | `feat/web-adapter` | `@praxis-ui/web` vanilla Custom Elements adapter |

---

## Recently Shipped

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

### Next

_No scheduled work. See Deferred below._

### Deferred (still pending)

- **`normalizeOptions` centralization** — shipped as `resolveAdapterCommonOptions` (#102) ✅
- **Selective `updated()` guard** — shipped (#103) ✅
- **`async-warn` for Tailwind** — shipped (#104) ✅
- **Conformance performance/isolation suites** — shipped (#105) ✅

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

## Appendix — Future Adapter Expansion

| Priority | Adapter | Status |
|----------|---------|--------|
| A1 | `@praxis-ui/lit` | ✅ Shipped (PRs #96–#99, #103) |
| A1 | `@praxis-ui/web` | ✅ Shipped (PR #106) |
| A2 | `@praxis-ui/angular` | Research only |
| A2 | `@praxis-ui/ember` | Research only |
| A3 | Storybook integration | Research only |
| A3 | Histoire integration | Research only |
| A3 | Visual conformance (Playwright) | Research only |
