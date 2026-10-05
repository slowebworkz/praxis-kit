# API stability — 1.x

praxis-kit publishes one package with ~19 subpaths. This page says which you can depend on and which
may still move, so a broad export map doesn't read as "everything is equally load-bearing."

This policy applies to the `praxis-kit` npm package from **1.0.2** onward. The package's history (a
`0.1.0` / `0.1.1` line, then `1.0.2`) is recorded in the [changelog](../packages/kit/CHANGELOG.md).

## If you're building components

You need **one** subpath — your framework adapter:

```ts
import { createContractComponent } from 'praxis-kit/react' // or /vue, /solid, /svelte, /preact, /lit, /web
```

A component author might also reach for **`praxis-kit/contract`** (framework-neutral option types,
state contracts, ARIA-rule factories) and **`praxis-kit/tailwind`** (the layout-aware class
pipeline). Everything else is opt-in tooling or power-user surface.

## Semver policy for 1.x

- **Stable** entries: no breaking change to their exported API within `1.x`; a breaking change ships
  only in a new major. Behaviour fixes that make praxis-kit _more_ spec-correct (an ARIA rule that
  stops mis-flagging valid markup) are not treated as breaking.
- **Experimental** entries: may change shape or be removed in any `1.x` minor release. Pin an exact
  version if you use them.

## The tiers

### Stable — the adoption path

| Subpath                                                          | For                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `praxis-kit/react`, `/react/legacy` (React 18)                   | The React adapter.                                                                                                                                                                                                                                                  |
| `praxis-kit/preact`, `/vue`, `/solid`, `/svelte`, `/lit`, `/web` | The other six adapters. Same `defineContract` / `createContractComponent` entry points, but real per-adapter differences — see the export breakdown below, not "identical."                                                                                         |
| `praxis-kit/svelte/Polymorphic.svelte`                           | The Svelte render component — a Svelte bundle is rendered via `<Polymorphic bundle={…}>`. Required for the Svelte adapter.                                                                                                                                          |
| `praxis-kit/contract`                                            | Framework-neutral contract authoring: `defineContract`, `declareProps`, `FactoryOptions` / `ContractInput` / `DefinedContract` / `EnforcementOptions` / `StylingOptions` types, the eight state contracts, the state-prop normalizers, the ARIA-rule fix factories. |
| `praxis-kit/tailwind`, `praxis-kit/tailwind.css`                 | `createTailwindPipeline` (the flex/grid-aware class pipeline) + `layoutKeys` + `LayoutProps` / `LayoutKey` types, and the safelist stylesheet.                                                                                                                      |

**Every adapter exports** `createContractComponent`, its own `*FactoryOptions` type, and
`ContractProps<T>` (recover a built component's prop contract from `typeof MyComponent`) — except
**Svelte**, see below. `defineContract` (`praxis-kit/contract`, above) is the way to author a
contract before passing it to any adapter's `createContractComponent`:

```ts
const buttonContract = defineContract({ tag: 'button', name: 'Button' })
const Button = createContractComponent(buttonContract)
```

`defineContractComponent` — the curried predecessor this superseded — has been **removed entirely**,
not deprecated. This is a breaking change for any consumer still using the curried
`defineContractComponent(options)(createContractComponent)` pattern; migrate to the two-step form
above.

React, Preact, and Vue export `Slottable` (and `SlottableProps`, React and Vue only — Preact's
`Slottable` has no separate props type to export) for `asChild` composition, plus the `Polymorphic*`
prop types; React adds `mergeRefs` and, with `render` mode, `RenderCallbackProps`. React is also the
only adapter that threads `enforcement.allowedAs` into its exported types today, so only React's
`as` prop narrows to the contract's own allowed-tag union — the other five accept any `ElementType`
there. **Solid** takes a different, non-`Slottable` approach to the same composition problem: pass
`asChild` with a render-prop function as `children` (see the Solid adapter's own README), so it
exports no `Slottable` at all. **Lit and Web** take no `as` / `asChild` and their SSR helper is
`renderContractToString`. **Svelte** returns a bundle (not a component), rendered through
`Polymorphic.svelte`, so it exports `BuiltRuntime` / `GenericsOf` / `ResolvedSlotProps` for typing
that bundle and its `asChild` snippet rather than `ContractProps`.

The `createContractComponent` / `FactoryOptions` contract is **frozen for 1.x** (architecture
freeze). See [ARCHITECTURE.md](../ARCHITECTURE.md).

### Stable tooling — dev-time, versioned with the package

| Subpath                | For                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `praxis-kit/eslint`    | The ESLint plugin (`no-invalid-html-nesting`, `valid-cardinality`, …). The plugin entry and rule names are stable; individual rule _messages_ and edge-case coverage may be tuned within `1.x`. |
| `praxis-kit/codemod`   | The `praxis-codemod` CLI (also installed as a bin).                                                                                                                                             |
| `praxis-kit/ts-plugin` | The TypeScript language-service plugin — editor diagnostics only, no importable API.                                                                                                            |

### Advanced — stable exports, niche

You only need these to build _on top of_ praxis-kit's enforcement, not to use it.

| Subpath             | For                                                                                                                                                                         | Note                                                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `praxis-kit/guards` | Symbol-aware tag resolution (`isTag`, `getTag`, `markComponentTag`) + base type guards — for authoring custom `enforcement.children` / `enforcement.aria` rules.            |                                                                                                                                                                                          |
| `praxis-kit/html`   | The built-in HTML/ARIA rule library (`HTML_ARIA_RULES` and the individual rules) — to reference, compose around, or discover the rules that already run on every component. | The **exports** are stable; the exact ARIA behaviour is still tightening under an active conformance audit — see [accessibility/html-aria-audit.md](./accessibility/html-aria-audit.md). |
| `praxis-kit/utils`  | General-purpose helpers praxis-kit uses internally (`memoize`).                                                                                                             |                                                                                                                                                                                          |

### Experimental — may change or be removed in a 1.x minor release

| Subpath                  | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `praxis-kit/vite-plugin` | Exports seven plugin factories — `contractPlugin`, `compoundPrunePlugin`, `classExtractPlugin`, `designTokensPlugin` (settling); **`slotTransformPlugin` (`asChild` transform), `staticCompositionPlugin` (static inlining), and `ssrOptimizePlugin` (the three optimisation plugins bundled in dependency order) are experimental** — pending differential tests (see the enforcement matrix in [README](../README.md)) — plus `PluginOptions` / `DesignTokens*` config types. The internal building blocks each plugin composes from are not exported. |

## Not an API

`praxis-kit/package.json` is exported only so tooling can resolve the package root.
