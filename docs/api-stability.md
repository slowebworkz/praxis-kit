# API stability — 0.1

praxis-kit publishes one package with ~19 subpaths. This page says which you can depend on and which
may still move, so a broad export map doesn't read as "everything is equally load-bearing."

## If you're building components

You need **one** subpath — your framework adapter:

```ts
import { createContractComponent } from 'praxis-kit/react' // or /vue, /solid, /svelte, /preact, /lit, /web
```

A component author might also reach for **`praxis-kit/contract`** (framework-neutral option types,
state contracts, ARIA-rule factories) and **`praxis-kit/tailwind`** (the layout-aware class
pipeline). Everything else is opt-in tooling or power-user surface.

## Semver policy for 0.1.x

- **Stable** entries: no breaking change to their exported API within `0.1.x`. Behaviour fixes that
  make praxis-kit _more_ spec-correct (an ARIA rule that stops mis-flagging valid markup) are not
  treated as breaking.
- **Experimental** entries: may change shape or be removed in any `0.1.x` release. Pin an exact
  version if you use them.
- 1.0 is where the whole surface — including today's Stable entries — gets a hard compatibility
  guarantee.

## The tiers

### Stable — the adoption path

| Subpath                                                          | For                                                                                                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `praxis-kit/react`, `/react/legacy` (React 18)                   | The React adapter.                                                                                                                                                                          |
| `praxis-kit/preact`, `/vue`, `/solid`, `/svelte`, `/lit`, `/web` | The other six adapters. Identical factory API.                                                                                                                                              |
| `praxis-kit/svelte/Polymorphic.svelte`                           | The Svelte render component — a Svelte bundle is rendered via `<Polymorphic bundle={…}>`. Required for the Svelte adapter.                                                                  |
| `praxis-kit/contract`                                            | Framework-neutral contract authoring: `FactoryOptions` / `EnforcementOptions` / `StylingOptions` types, the eight state contracts, the state-prop normalizers, the ARIA-rule fix factories. |
| `praxis-kit/tailwind`, `praxis-kit/tailwind.css`                 | `createTailwindPipeline` (the flex/grid-aware class pipeline) + `layoutKeys` + `LayoutProps` / `LayoutKey` types, and the safelist stylesheet.                                              |

**Every adapter exports** `createContractComponent`, `defineContractComponent`, its own
`*FactoryOptions` type, and `ContractProps<T>` (recover a built component's prop contract from
`typeof MyComponent`). The VDOM adapters (React, Preact, Vue, Solid) additionally export `Slottable`
for `asChild` composition (React/Preact/Vue also `SlottableProps`) and the `Polymorphic*` prop
types; React adds `mergeRefs` and, with `render` mode, `RenderCallbackProps`. **Lit and Web** take
no `as` / `asChild` and their SSR helper is `renderContractToString`. **Svelte** returns a bundle
(not a component), rendered through `Polymorphic.svelte`, so it exports `BuiltRuntime` /
`GenericsOf` / `ResolvedSlotProps` for typing that bundle and its `asChild` snippet rather than
`ContractProps`.

The `createContractComponent` / `FactoryOptions` contract is **frozen for 0.1** (architecture
freeze). See [ARCHITECTURE.md](../ARCHITECTURE.md).

### Stable tooling — dev-time, versioned with the package

| Subpath                | For                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `praxis-kit/eslint`    | The ESLint plugin (`no-invalid-html-nesting`, `valid-cardinality`, …). The plugin entry and rule names are stable; individual rule _messages_ and edge-case coverage may be tuned within `0.1.x`. |
| `praxis-kit/codemod`   | The `praxis-codemod` CLI (also installed as a bin).                                                                                                                                               |
| `praxis-kit/ts-plugin` | The TypeScript language-service plugin — editor diagnostics only, no importable API.                                                                                                              |

### Advanced — stable exports, niche

You only need these to build _on top of_ praxis-kit's enforcement, not to use it.

| Subpath             | For                                                                                                                                                                         | Note                                                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `praxis-kit/guards` | Symbol-aware tag resolution (`isTag`, `getTag`, `markComponentTag`) + base type guards — for authoring custom `enforcement.children` / `enforcement.aria` rules.            |                                                                                                                                                                                          |
| `praxis-kit/html`   | The built-in HTML/ARIA rule library (`HTML_ARIA_RULES` and the individual rules) — to reference, compose around, or discover the rules that already run on every component. | The **exports** are stable; the exact ARIA behaviour is still tightening under an active conformance audit — see [accessibility/html-aria-audit.md](./accessibility/html-aria-audit.md). |
| `praxis-kit/utils`  | General-purpose helpers praxis-kit uses internally (`memoize`).                                                                                                             |                                                                                                                                                                                          |

### Experimental — may change or be removed in 0.1.x

| Subpath                  | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `praxis-kit/vite-plugin` | Exports seven plugin factories — `contractPlugin`, `compoundPrunePlugin`, `classExtractPlugin`, `designTokensPlugin` (settling); **`slotTransformPlugin` (`asChild` transform), `staticCompositionPlugin` (static inlining), and `ssrOptimizePlugin` (the three optimisation plugins bundled in dependency order) are experimental** — pending differential tests (see the enforcement matrix in [README](../README.md)) — plus `PluginOptions` / `DesignTokens*` config types. The internal building blocks each plugin composes from are not exported. |

## Not an API

`praxis-kit/package.json` is exported only so tooling can resolve the package root.
