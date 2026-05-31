# Changelog

## [Unreleased]

### BREAKING — `@praxis-ui/tailwind` layout pipeline: `none` is now a real mode

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

### HTML5 structural contracts (`@praxis-ui/core`)

`htmlContracts` is a new export from `@praxis-ui/core` providing ready-made `EnforcementOptions`
objects for HTML elements with restricted content models. Pass directly to `createContractComponent`
instead of writing `match` predicates by hand:

```ts
import { htmlContracts } from '@praxis-ui/core'
import { createContractComponent } from '@praxis-ui/react'

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

### `no-invalid-html-nesting` rule (`@praxis-ui/eslint-plugin`)

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

All packages moved from `@polymorphic-ui/*` to `@praxis-ui/*`. Update every import and
`package.json` dependency entry. The `@praxis-ui/codemod` CLI automates the factory rename below;
the package scope rename requires a find-and-replace across your project.

#### Factory rename: `createPolymorphicComponent` → `createContractComponent`

```bash
# Automated migration
npx @praxis-ui/codemod --from createPolymorphicComponent --to createContractComponent --files "src/**/*.ts"
npx @praxis-ui/codemod --from createPolymorphicComponent --to createContractComponent --files "src/**/*.tsx"
```

The codemod handles renames in all positions (call sites, type annotations, re-exports).

### New packages

| Package                    | Role                                                                     |
| -------------------------- | ------------------------------------------------------------------------ |
| `@praxis-ui/eslint-plugin` | Six lint rules enforcing contract API correctness                        |
| `@praxis-ui/ts-plugin`     | TypeScript language service plugin — inline editor diagnostics           |
| `@praxis-ui/codemod`       | CLI for factory rename migrations                                        |
| `@praxis-ui/vite-plugin`   | Build-time optimization and enforcement pipeline (expanded from v1 stub) |

### ESLint rules (`@praxis-ui/eslint-plugin`)

| Rule                            | Severity | Description                                                                              |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `no-enforcement-without-strict` | error    | Requires `enforcement.strict` whenever `children` or `aria` is declared                  |
| `no-redundant-role`             | warn     | Flags `role` attrs that duplicate the element's implicit ARIA role (auto-fix)            |
| `valid-cardinality`             | error    | Rejects impossible cardinality rules (negative bounds, max < min, max === 0)             |
| `no-dead-compound`              | error    | Catches compound variant entries whose conditions can never fire                         |
| `no-invalid-default`            | error    | Validates `styling.defaults` entries against `styling.variants`                          |
| `valid-children-config`         | error    | Cross-rule consistency: duplicate `first`/`last` positions, `only` + other min conflicts |

### TypeScript plugin (`@praxis-ui/ts-plugin`)

Editor-integrated diagnostics via the TypeScript language service (tsserver / VS Code). No `tsc` run
required — violations surface inline as you type.

- Code 90001 (warning) — mirrors `no-enforcement-without-strict`
- Codes 90002/90003/90004/90005 (error/warning) — mirrors `valid-cardinality`

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      { "name": "@praxis-ui/ts-plugin", "config": { "calleeNames": ["createContractComponent"] } }
    ]
  }
}
```

### Vite plugin expansion (`@praxis-ui/vite-plugin`)

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

`asChild` implemented in `@praxis-ui/svelte` using `Snippet<[Props]>` — callers pass a typed snippet
and the adapter calls it with merged slot props. Mutual exclusion of `as` + `asChild` enforced via
`SlotValidator`.

### Analysis tooling

Three workspace-level commands, all CI-gated after the test step:

- `pnpm analyze:deps` — dependency-cruiser layer enforcement
- `pnpm analyze:duplicates` — jscpd copy-paste detection (15% threshold)
- `pnpm analyze:patterns` — ast-grep structural rules (`current-no-forwardRef`,
  `adapter-raw-primitive-import`, `adapter-raw-contract-import`)

### Unified debug surface

`diagnose(options, tag, props, children?, className?, variantKey?)` in `@praxis-ui/core` returns a
single `ComponentDiagnosis` covering class pipeline, ARIA violations, and children violations —
without side effects or `strict` mode interference.

### Migration

See [MIGRATING.md](./MIGRATING.md) for upgrade paths. The `@praxis-ui/codemod` CLI handles the
factory rename; the package scope rename requires a global find-and-replace.

---

## v1.0.0 — Architectural Launch

This is not an incremental release. v1.0.0 is a complete architectural rewrite that replaces the
monolithic core package with a layered, capability-driven runtime. The public API is intentionally
backward-compatible for common usage; the internal structure is wholly new.

### What changed

#### Layered lib/ runtime

The monolithic `packages/core` is now backed by three private library packages:

| Package                | Role                                                     |
| ---------------------- | -------------------------------------------------------- |
| `@praxis-ui/primitive` | Tag resolution, prop merging, base types                 |
| `@praxis-ui/contract`  | ARIA policy engine, children evaluator, strict-mode base |
| `@praxis-ui/styling`   | CVA wrapper, class pipeline, variant resolver            |

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

| Adapter               | Strategy                                                          |
| --------------------- | ----------------------------------------------------------------- |
| `@praxis-ui/react`    | React 19 (`current/`) + React 18 (`legacy/`) ref split            |
| `@praxis-ui/vue`      | `defineComponent`, `h()`, `cloneVNode` slot protocol              |
| `@praxis-ui/tailwind` | Layout-aware class pipeline plugin                                |
| `@praxis-ui/preact`   | `forwardRef` from `preact/compat`                                 |
| `@praxis-ui/solid`    | Client + SSR (separate vitest configs)                            |
| `@praxis-ui/svelte`   | Returns a `BuiltRuntime` bundle; renders via `Polymorphic.svelte` |

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
