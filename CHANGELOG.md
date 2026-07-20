# Changelog

## v6.2.3 — Built-in `<input>` HTML/ARIA/Accessibility Rules

### New: implicit `<input>` semantic rule library

`HTML_ARIA_RULES` now includes a first per-element rule library for `<input>` — no consumer opt-in
required, it applies to any component resolving to `<input>` the same way the existing landmark-role
rules already do implicitly.

- **Attribute-vs-type facts**: `checked` (checkbox/radio only), `multiple` (email/file only),
  `maxLength`/`minLength`/`pattern` (text-entry types only), `min`/`max`/`step` (numeric/date types
  only), `accept`/`capture` (file only) — each warns and offers an automatic fix that removes the
  now-meaningless attribute.
- **Unsupported `type` detection**: a misspelled or made-up `type` value (e.g. `type="phone"`)
  silently falls back to `type="text"` per spec; this is now flagged as a likely typo.
- **Accessible-name advisories**: warns when an `<input>` has no accessible name, including the
  specific case where only a `placeholder` is present (placeholder text isn't a substitute for a
  label).
- **Password `autoComplete`**: warns when `type="password"` has no `current-password`/
  `new-password` autocomplete hint.
- **`required` + `readOnly` conflict**: warns on the combination, since a read-only field can never
  satisfy `required` validation interactively.

### New: general allowed-roles check (`roleNotPermittedRule`)

Explicit `role` overrides are now validated against a documented allowed-roles table (per the
WAI-ARIA "ARIA in HTML" recommendation) across native elements — not just the existing
redundant-role and landmark-role-override checks. Covers common elements (`a`, `button`, `select`,
headings, lists, `table`, `dialog`, `fieldset`, `img`, and `<input>` per `type`); elements with
context-dependent allowed roles this engine can't determine from a single element (e.g. `<td>`
inside a `role="grid"` ancestor) are intentionally left unmodeled rather than guessed.

### Diagnostic catalog rework

Each diagnostic now carries its own fixed severity — rules read `diagnostic.severity` instead of
re-deciding warn-vs-error at each call site. `DiagnosticCode` documents reserved numeric ranges per
category, with `<input>`-specific HTML facts moved to a nested `HtmlDiagnostics.input` namespace
(one code per attribute) and a new `InputAccessibilityDiagnostics` catalog for the best-practice
advisories above.

### Known limitation

The `roleNotPermittedRule` allowed-roles table was authored from well-established fragments of the
WAI-ARIA "ARIA in HTML" spec, not generated from it mechanically — treat it as a solid starting
point rather than an exhaustive, spec-verified reference.

## v6.2.0 — Enforcement Defaults Now Actually Enforce, Public ARIA Rule Types

### ⚠️ Behavior change: `allowedAs` and custom `aria` rules now throw by default

`resolveFactoryOptions` re-derived the diagnostics default from scratch instead of using the
adapter-resolved default (`throwDiagnostics` for React/Vue/Preact/Solid/Svelte, `silentDiagnostics`
for Lit/Web), silently falling back to `silentDiagnostics` whenever a component omitted
`enforcement.diagnostics`. This meant `enforcement.allowedAs` and any custom `enforcement.aria` rule
produced **zero** feedback — no throw, no console output at all — unless a component explicitly set
`enforcement.diagnostics`.

This is now fixed: the adapter-resolved default reaches `resolveFactoryOptions` correctly, so
components using `allowedAs` and/or a custom `aria` rule without an explicit `diagnostics` override
will go from silent to throwing on `severity: 'error'` violations under the
React/Vue/Preact/Solid/Svelte default (Lit/Web remain silent by default, matching their documented
`silentDiagnostics` default).

**This is the documented default finally taking effect, not a new stricter mode** — but if your
components rely on `allowedAs` or a custom `aria` rule and don't set `enforcement.diagnostics`
explicitly, upgrading may surface throws where there were previously none. Add
`enforcement.diagnostics: 'warn'` (or `'silent'`) to any component where you want to keep the
previous non-throwing behavior while you audit.

### Public ARIA rule types (`praxis-kit/contract`)

`AriaRule` and its supporting types (`AriaContext`, `AriaResult`, `AriaInvalidResult`, `AriaFix`,
`AriaFixResult`, `FixKind`, `Severity`, etc.) are now exported from `praxis-kit/contract`.
Previously these types existed and were used internally by `EnforcementOptions.aria`, but weren't
reachable by consumers — a custom `enforcement.aria` rule had to be written as a plain
object/function literal and rely on structural typing instead of a named import.

## v6.1.1 — ARIA Cache Correctness, Public Guards, Empty Class Attributes

### ARIA plan cache blind spot for custom rules (`@praxis-kit/contract`)

`AriaPolicyEngine`'s plan cache key only encoded `tag`/`role`/`type`/`alt`/`aria-*` — exactly what
the built-in rule pipeline reads. A custom `enforcement.aria` rule inspecting any other prop (e.g.
`href`) could have its first-render outcome cached and blindly replayed against later elements
sharing the same key, regardless of the prop the rule actually depended on. Custom rules can now
declare `readsProps: readonly string[]` to opt back into caching — those props get folded into the
key; rules that omit it safely bypass the cache instead of risking a stale replay.

Also fixed several `isNull`/`!isNull` checks in the ARIA validator that only excluded strict `null`,
letting `undefined` (the actual "absent" value for optional fields and `Map#get` misses) slip
through unrejected — most notably causing `role=""` on a tag with an implicit role (e.g.
`<footer role="" aria-autocomplete="all">`) to skip the entire aria-* attribute pipeline for that
render.

### Public `praxis-kit/guards` export

`isObject`, `isString`, `isTag`, `getTag`, and `isFlowContent` are now reachable from a new
`praxis-kit/guards` subpath, so consumers authoring custom `enforcement.children`/`enforcement.aria`
rules don't need to hand-roll praxis-kit's own symbol-aware tag resolution.

### Empty `class`/`className` attribute

`resolveClasses()` returned `''` whenever no base, variant, or caller classes resolved, and every
adapter wrote that unconditionally onto the host element — producing `<div class>` / `class=""`
instead of omitting the attribute. Fixed across React, Preact, Vue, Svelte, Solid, Lit, and Web,
including a Lit/Web-specific fix (the DOM `className` property setter stringifies `undefined` rather
than omitting it) and a Vue-specific fix (its SSR renderer and client-side patcher previously
disagreed on how to handle `class: undefined`).

No breaking changes.

## v6.1.0 — Caching Primitives (`@praxis-kit/primitive`)

Three general-purpose caching utilities, extracted from patterns that were previously hand-rolled in
multiple places:

- `lazy(factory)` — lazily initializes a value; the factory runs exactly once on first access
  (including when it returns a falsy value), and every subsequent call returns the cached result.
  Adopted by the React render pipeline (`adapters/react`) and the vite diagnostics pass
  (`plugins/vite`), replacing hand-rolled `??=` caches.
- `memoize(fn)` — memoizes a pure, single-argument function in an unbounded `Map`, keyed by
  SameValueZero equality.
- `LRUCache` — a bounded cache that evicts the least-recently-used entry once `maxSize` is exceeded.
  Consolidates LRU eviction logic that was previously duplicated across `AriaPolicyEngine#planCache`
  (`@praxis-kit/contract`), `StaticClassResolver`, and `VariantClassResolver`
  (`@praxis-kit/styling`), all three of which now use it directly.

No breaking changes.

## v6.0.0 — Dynamic Child-Cardinality Rules & Complete Layout-Mode Stripping

### `dynamic(...)` child-cardinality rules (`@praxis-kit/contract`)

`enforcement.children` cardinality rules can now depend on the resolved render context instead of
being fixed at declaration time:

```ts
createContractComponent({
  tag: 'div',
  enforcement: {
    children: [
      {
        name: 'Item',
        match: isItem,
        cardinality: dynamic((ctx) =>
          ctx.tag === 'ul' || ctx.tag === 'ol' ? { min: 1 } : { max: 0 },
        ),
      },
    ],
  },
})
```

`ChildrenEvaluator.evaluate(children, context?)` now accepts an optional `{ tag, props }` context to
resolve `dynamic(...)` rules against. Every adapter (Solid, React, Preact, Vue, Lit, Web, Svelte)
passes this context on every render — a `dynamic(...)` rule with no context supplied emits a dev
diagnostic rather than silently resolving incorrectly.

Built on a new generic `Rule<T, C>` primitive (`@praxis-kit/primitive`) underlying child-rule
cardinality resolution.

### BREAKING — `@praxis-kit/tailwind` `'none'` mode now strips all layout-dependent utilities

v5.0.0 introduced `'none'` mode (neither `flex` nor `grid` set) stripping layout-dependent classes,
but the implementation only covered flex-family and grid-family utility prefixes. Utilities valid in
both flex and grid — `items-*`, `justify-*`, `content-*`, `self-*`, `order*`, `place-*` — and
grid-only `justify-items-*`/`justify-self-*` fell through unstripped:

```tsx
// Before: items-start survived unconditionally, regardless of mode.
// After:  none mode strips it, same as flex-*/grid-*.
<Box className="items-start justify-items-start rounded" /> // → "rounded"
```

`items-start` (and the rest of this set) now behaves exactly like `flex-col`/`grid-cols-2` already
did: present only when the matching `flex`/`grid` prop is set, or always-present for the truly
shared subset when _either_ is set. Any component whose Tailwind classes assumed these survived
unconditionally should verify output after upgrading.

### BREAKING — `LayoutMode` renamed to `ResolvedLayout` (`@praxis-kit/tailwind`)

`'none'` is the absence of a resolved layout, not a layout itself, so the type is renamed to match:

```ts
// Before
import type { LayoutMode } from 'praxis-kit/tailwind'
// After
import type { ResolvedLayout } from 'praxis-kit/tailwind'
```

No runtime behavior change — update the import name.

## v5.0.0 — Open-by-Default Contracts & HTML5 Structural Enforcement

### BREAKING — `enforcement.children` is now open by default (`@praxis-kit/contract`)

A rule in `enforcement.children` is a cardinality **constraint**, not an allow-list. Previously, any
non-empty `children` array silently rejected every child that didn't match a listed rule — including
plain text — as a side effect of declaring even one optional or required rule:

```ts
createContractComponent({
  tag: 'div',
  enforcement: {
    children: [{ name: 'Header', match: isHeader, cardinality: { min: 1 } }],
  },
})
// Before: <Comp><Header /><Footer /></Comp> → "unexpected child" on Footer, and on any text node.
// After:  <Comp><Header /><Footer /></Comp> → passes. Header is required; everything else is allowed.
```

Two new orthogonal `EnforcementOptions` flags restore the previous behavior as an explicit opt-in:

- `exclusiveChildren: true` — closes the set: only children matching a listed rule (or text, per
  `allowText`) are valid; anything else is rejected. This is what the old default behaved like.
- `allowText: false` — rejects text/number children regardless of mode. Default is `true`: text is
  always valid unless explicitly disallowed.

**Migration:** any component relying on the implicit closed-set rejection — "only these children,
nothing else" — needs `exclusiveChildren: true` added to its `enforcement` block to keep that
behavior. Built-in `htmlContracts`/`widgetContracts` (`@praxis-kit/core`) have already been updated;
author-defined components have not.

Also fixes a latent bug: both live `ChildrenEvaluator` construction sites (the adapter runtime and
`getHtmlChildrenEvaluator`) gated construction on `children?.length`, so an empty rule array (the
void-element pattern) never actually built a live evaluator — void-element rejection was previously
only exercised by isolated unit tests, not enforced at runtime.

### Preset / default variant validation (`@praxis-kit/core`)

`createContractComponent` now validates the variant surface at construction time: a
`styling.presets` selection or `styling.defaults` entry that references a variant key — or a value
of a key — not declared in `styling.variants` resolves to no class at runtime, silently. TypeScript
catches this in typed usage, but untyped JS consumers and `as`-cast escapes bypass it.

The check mirrors the type contract at runtime, gated on `enforcement.strict`:

```ts
createContractComponent({
  tag: 'div',
  styling: {
    variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
    presets: { compact: { size: 'xl' } }, // 'xl' is not a declared size
  },
  enforcement: { strict: 'warn' }, // → console.warn; 'throw' → throws; false → silent (default)
})
```

Dev-only (tree-shaken from production builds) and a no-op when `strict` is `false`, so existing
components are unaffected. Render-time checks — unknown `variantKey`, undefined variant value at the
call site — are a planned follow-up (they require `strict` threaded into the class resolver).

### BREAKING — `@praxis-kit/tailwind` layout pipeline: `none` is now a real mode

When **neither** the `flex` nor `grid` prop is set, the layout pipeline previously returned the raw
class string **unchanged** (passthrough). It now resolves to an explicit `'none'` mode and **strips
all layout-dependent classes**: the `flex`/`grid` display literals, every flex-family utility
(`flex-*`, `grow`, `shrink`, `basis-*`), every grid-family utility (`grid-*`, `col-*`, `row-*`,
`auto-cols-*`, `auto-rows-*`), and `gap-*` (gap requires an active display mode).

```tsx
// Before: passthrough — grid-cols-2 survived.
// After:  none mode — grid-cols-2 (and gap-4) are stripped.
<Box className="grid-cols-2 gap-4 rounded" /> // → "rounded"
```

The display mode is now owned **solely** by the `flex`/`grid` props. A `flex`/`grid` class in a
class string no longer sets the mode (`LayoutState` no longer infers from tokens). To get a layout,
pass the prop: `<Box grid className="grid-cols-2" />`.

**Reserved layout literals.** Because the mode is prop-owned, a `flex`/`grid` _display literal_
appearing in resolved classes (base, variants, or `className`) is an authoring mistake and now emits
a dev `console.warn`. Use the prop, not the class.

**Dead-variant detection.** When an active variant's _entire_ class contribution is stripped under
the resolved mode — e.g. `<Box flex cols="2" />` where `cols="2"` resolves only to `grid-cols-2` —
the variant is an exposed prop that produces nothing. The plugin reconstructs each active variant's
classes (from props, the active preset, and `defaultVariants`) and emits a dev `console.warn` naming
the dead variant. Limitation: compound variants are not attributed (a compound's class fires across
dimensions and can't be charged to one variant), so only per-dimension variants are checked.

**Stripping is resemblance-based (accepted break point).** A class is stripped under a conflicting
mode because its name matches a Tailwind grid/flex prefix, **not** because it's verified to be a
real Tailwind utility. So a custom class like `grid-triplets-1` is stripped in flex mode purely
because it resembles a grid utility. The plugin does not resolve against the Tailwind config — do
not name custom classes after Tailwind grid/flex prefixes if they must survive a mode switch.

Migration: if you relied on layout utilities rendering without a `flex`/`grid` prop, add the
matching prop (`<Box flex …>` / `<Box grid …>`).

### HTML5 structural contracts (`@praxis-kit/core`)

`htmlContracts` is a new export from `@praxis-kit/core` providing ready-made `EnforcementOptions`
objects for HTML elements with restricted content models. Pass directly to `createContractComponent`
instead of writing `match` predicates by hand:

```ts
import { htmlContracts } from '@praxis-kit/core'
import { createContractComponent } from '@praxis-kit/react'

const List = createContractComponent({ tag: 'ul', enforcement: htmlContracts.ul })
```

All contracts default to `strict: 'warn'`. Override the severity with a spread:

```ts
enforcement: { ...htmlContracts.table, strict: 'throw' }
```

| Export              | Tag(s)                    | Constraint summary                                                     |
| ------------------- | ------------------------- | ---------------------------------------------------------------------- |
| `listContract`      | `ul`, `ol`                | Only `li`, `script`, `template`                                        |
| `tableContract`     | `table`                   | `caption` (≤1, first), `colgroup`, `thead`/`tfoot` (≤1), `tbody`, `tr` |
| `tableBodyContract` | `thead`, `tbody`, `tfoot` | Only `tr`, `script`, `template`                                        |
| `tableRowContract`  | `tr`                      | Only `td`, `th`, `script`, `template`                                  |
| `colgroupContract`  | `colgroup`                | Only `col`, `template`                                                 |
| `dlContract`        | `dl`                      | Only `dt`, `dd`, `div`, `script`, `template`                           |
| `selectContract`    | `select`                  | Only `option`, `optgroup`, `hr`, `script`, `template`                  |
| `optgroupContract`  | `optgroup`                | Only `option`, `script`, `template`                                    |
| `pictureContract`   | `picture`                 | `source` (any), `img` (exactly 1)                                      |
| `figureContract`    | `figure`                  | `figcaption` (≤1) + any flow content                                   |
| `detailsContract`   | `details`                 | `summary` (≤1, first) + any flow content                               |
| `fieldsetContract`  | `fieldset`                | `legend` (≤1, first) + any flow content                                |

`htmlContracts` is a keyed map (`htmlContracts.ul`, `htmlContracts.table`, etc.) covering all of the
above. Named exports are also available for explicit imports.

The `match` predicates duck-type on the child's `type` property — compatible with React, Preact, and
Vue VNodes. Adapters filter children to valid elements before the evaluator runs, so text nodes and
falsy conditional values are never flagged.

### `no-invalid-html-nesting` rule (`@praxis-kit/eslint-plugin`)

New lint rule (error in recommended config) that statically checks JSX for direct children that
violate the HTML5 content model of their parent. Covers `ul`/`ol`, `table`/`thead`/`tbody`/`tfoot`/
`tr`, `dl`, `select`, `optgroup`, `colgroup`, and `picture`.

```tsx
<ul>
  <div>bad</div>{' '}
  {/* ← error: <div> is not a valid direct child of <ul>. Allowed: li, script, template */}
</ul>
```

Component children (uppercase tags) and dynamic expression containers are always skipped — the rule
only flags statically-known intrinsic HTML tags.

---

## v2.0.0 — Static/Runtime Contract System

### Breaking changes

#### Package scope rename

All packages moved from `@polymorphic-ui/*` to `@praxis-kit/*`. Update every import and
`package.json` dependency entry. The `@praxis-kit/codemod` CLI automates the factory rename below;
the package scope rename requires a find-and-replace across your project.

#### Factory rename: `createPolymorphicComponent` → `createContractComponent`

```bash
# Automated migration
npx @praxis-kit/codemod --from createPolymorphicComponent --to createContractComponent --files "src/**/*.ts"
npx @praxis-kit/codemod --from createPolymorphicComponent --to createContractComponent --files "src/**/*.tsx"
```

The codemod handles renames in all positions (call sites, type annotations, re-exports).

### New packages

| Package                     | Role                                                                     |
| --------------------------- | ------------------------------------------------------------------------ |
| `@praxis-kit/eslint-plugin` | Six lint rules enforcing contract API correctness                        |
| `@praxis-kit/ts-plugin`     | TypeScript language service plugin — inline editor diagnostics           |
| `@praxis-kit/codemod`       | CLI for factory rename migrations                                        |
| `@praxis-kit/vite-plugin`   | Build-time optimization and enforcement pipeline (expanded from v1 stub) |

### ESLint rules (`@praxis-kit/eslint-plugin`)

| Rule                            | Severity | Description                                                                              |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `no-enforcement-without-strict` | error    | Requires `enforcement.strict` whenever `children` or `aria` is declared                  |
| `no-redundant-role`             | warn     | Flags `role` attrs that duplicate the element's implicit ARIA role (auto-fix)            |
| `valid-cardinality`             | error    | Rejects impossible cardinality rules (negative bounds, max < min, max === 0)             |
| `no-dead-compound`              | error    | Catches compound variant entries whose conditions can never fire                         |
| `no-invalid-default`            | error    | Validates `styling.defaults` entries against `styling.variants`                          |
| `valid-children-config`         | error    | Cross-rule consistency: duplicate `first`/`last` positions, `only` + other min conflicts |

### TypeScript plugin (`@praxis-kit/ts-plugin`)

Editor-integrated diagnostics via the TypeScript language service (tsserver / VS Code). No `tsc` run
required — violations surface inline as you type.

- Code 90001 (warning) — mirrors `no-enforcement-without-strict`
- Codes 90002/90003/90004/90005 (error/warning) — mirrors `valid-cardinality`

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      { "name": "@praxis-kit/ts-plugin", "config": { "calleeNames": ["createContractComponent"] } }
    ]
  }
}
```

### Vite plugin expansion (`@praxis-kit/vite-plugin`)

All plugins are pure transforms — no side effects, no Vite internals, tree-shakeable.

| Plugin                      | What it does                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------- |
| `classExtractPlugin()`      | Precomputes all static variant combinations (≤512) and injects `precomputedClasses`     |
| `designTokensPlugin()`      | Emits `praxis-tokens.json` with per-component tokens and a flat Tailwind safelist       |
| `staticCompositionPlugin()` | Replaces same-file static JSX usage sites with direct element creation                  |
| `ssrOptimizePlugin()`       | Bundles slot transform + class extract + static composition in dependency order         |
| `slotTransformPlugin()`     | Rewrites safe `asChild` usage sites to render-prop form at build time                   |
| `contractPlugin()`          | Build-time cardinality enforcement — single-file and cross-file via constraint registry |
| `pruneDeadCompounds()`      | Eliminates unreachable `styling.compounds` entries from the output bundle               |

`staticCompositionPlugin` eligibility: same-file factory definition, no spread attributes, no
`as`/`asChild`/`render`, all variant props static, `className` absent or static, no top-level
`defaults` or `enforcement`. Cross-file composition is deferred (requires module-graph traversal).

### Per-capability tree shaking (React)

Five factory tiers let consumers pay only for the capabilities they use:

```txt
Factory                         Modules  Gzip    Excluded
createPolymorphicComponent      30       3146 B  styling engine · ARIA engine · children evaluator
createAriaEnforcedComponent     34       5353 B  styling engine · children evaluator
createChildrenEnforcedComponent 39       4395 B  styling engine · ARIA engine
createContractedComponent       43       6546 B  styling engine
createContractComponent         51       7641 B  —
```

All five ship in both `current/` (React 19, plain ref) and `legacy/` (React 18, `forwardRef`)
variants.

### Runtime improvements

#### Lazy enforcement + production stripping

- `ChildrenEvaluator.evaluate()` exits immediately when `strict: false` — the full match/validate
  cycle no longer runs with output suppressed
- All adapters wrap `childrenEvaluator.evaluate()` in `process.env.NODE_ENV !== 'production'` —
  dead-code-eliminated in production bundles by every major bundler

#### O(1) class lookup

`VariantClassResolver` checks the `precomputedClasses` map (injected by `classExtractPlugin`) before
the LRU cache — O(1) map lookup replaces a CVA call + cache write for every statically-known variant
combination.

#### Svelte `asChild` via parameterized Snippet

`asChild` implemented in `@praxis-kit/svelte` using `Snippet<[Props]>` — callers pass a typed
snippet and the adapter calls it with merged slot props. Mutual exclusion of `as` + `asChild`
enforced via `SlotValidator`.

### Analysis tooling

Three workspace-level commands, all CI-gated after the test step:

- `pnpm analyze:deps` — dependency-cruiser layer enforcement
- `pnpm analyze:duplicates` — jscpd copy-paste detection (15% threshold)
- `pnpm analyze:patterns` — ast-grep structural rules (`current-no-forwardRef`,
  `adapter-raw-primitive-import`, `adapter-raw-contract-import`)

### Unified debug surface

`diagnose(options, tag, props, children?, className?, variantKey?)` in `@praxis-kit/core` returns a
single `ComponentDiagnosis` covering class pipeline, ARIA violations, and children violations —
without side effects or `strict` mode interference.

### Migration

See [MIGRATING.md](./MIGRATING.md) for upgrade paths. The `@praxis-kit/codemod` CLI handles the
factory rename; the package scope rename requires a global find-and-replace.

---

## v1.0.0 — Architectural Launch

This is not an incremental release. v1.0.0 is a complete architectural rewrite that replaces the
monolithic core package with a layered, capability-driven runtime. The public API is intentionally
backward-compatible for common usage; the internal structure is wholly new.

### What changed

#### Layered lib/ runtime

The monolithic `packages/core` is now backed by three private library packages:

| Package                 | Role                                                     |
| ----------------------- | -------------------------------------------------------- |
| `@praxis-kit/primitive` | Tag resolution, prop merging, base types                 |
| `@praxis-kit/contract`  | ARIA policy engine, children evaluator, strict-mode base |
| `@praxis-kit/styling`   | CVA wrapper, class pipeline, variant resolver            |

These packages are private (`lib/`). `packages/core` is still the single import point for consumers;
the lib/ split is an implementation boundary, not a new surface.

#### Capability-driven factory

The ARIA policy engine is no longer instantiated unconditionally. A component only pays for the
engine if it declares `enforcement` in its factory options. A pure styling component has zero ARIA
overhead at runtime.

```ts
// No ARIA engine — zero enforcement cost
createPolymorphic({ styling: { base: 'btn', variants } })

// ARIA engine active — capabilities opt in
createPolymorphic({
  styling: { base: 'link', tagMap: { button: 'link--button' } },
  enforcement: { strict: 'warn', aria: [...rules] },
})
```

#### Shared adapter infrastructure (`lib/adapter-utils`)

All six framework adapters (React, Vue, Tailwind, Preact, Solid, Svelte) now share a common
`lib/adapter-utils` package for runtime construction and prop filtering. Per-framework code is
reduced to render mechanics and lifecycle integration only.

#### Class pipeline diagnostics

A new `diagnoseClassPipeline` function exposes the full resolution trace: base class, tag-map
(applied or bypassed), preset values, effective variants, and per-compound-variant match/mismatch
detail. Intended for debugging, not production rendering.

#### Type system hardening

- `EmptyRecord = Record<never, never>` — replaces 25+ inline occurrences of the empty record pattern
  used as generic defaults across all adapter signatures.
- `VariantConditionValue = string | boolean | ReadonlyArray<string | boolean>` — narrows
  `CompoundTrace.conditions` from `AnyRecord` to the actual domain of compound variant condition
  values.
- `AnyRecord` and `UnknownProps` are used consistently throughout; raw `Record<string, unknown>` no
  longer appears at API boundaries.

#### Framework adapter coverage

| Adapter                | Strategy                                                          |
| ---------------------- | ----------------------------------------------------------------- |
| `@praxis-kit/react`    | React 19 (`current/`) + React 18 (`legacy/`) ref split            |
| `@praxis-kit/vue`      | `defineComponent`, `h()`, `cloneVNode` slot protocol              |
| `@praxis-kit/tailwind` | Layout-aware class pipeline plugin                                |
| `@praxis-kit/preact`   | `forwardRef` from `preact/compat`                                 |
| `@praxis-kit/solid`    | Client + SSR (separate vitest configs)                            |
| `@praxis-kit/svelte`   | Returns a `BuiltRuntime` bundle; renders via `Polymorphic.svelte` |

### Upgrading from v0

See [MIGRATING.md](./MIGRATING.md) for upgrade paths from CVA, Radix Slot, and Chakra UI. The
[ARCHITECTURE.md](./ARCHITECTURE.md) documents the full runtime model including debugging guidance.

### Git history

The v1.0.0 history is a clean linear rebase of the rewrite branch onto main:

```text
87655cc  chore(workspace): monorepo scaffold
5d91787  feat(lib): add runtime foundation — primitive, contract, styling
d0d5f98  feat(architecture): capability-driven factory — lib/ modules, adapter-utils, ARIA gating
985b453  feat(quality): integration tests, build hardening, class diagnostics, type aliases
```

The previous architecture is preserved at the `v0-legacy` tag for reference.

---

## v0 — Legacy

See `git log v0-legacy` for the full history of the original monolithic architecture. Not actively
maintained.
