# Examples

There is no `examples/*` workspace in this repo, and there isn't going to be one — unlike `../pk`,
which ships a runnable Box/Button/Tabs dev server per adapter under `examples/*`, real
praxis-kit-based components live in the separate `praxis-components` library instead. This document
covers what exists here as the closest thing to a worked example: real, complete component configs
you can read or copy, plus pointers to where praxis-kit is actually exercised end to end in this
repo's own tests.

## Where to see praxis-kit exercised end to end today

### `qa/tree-shaking-tests`

`scenarios/package/*` imports `praxis-kit/<adapter>` the way a real consumer would — through the
built `dist/` output, not source — for a small, deliberately narrow scenario per adapter (a
primitive-only import, an ARIA-only import, a styling-only import, and so on), then asserts on what
survived bundling. It's the closest thing in this repo to "here's a minimal consumer of the
`praxis-kit` package," even though its purpose is bundle-shape verification rather than a feature
walkthrough. `scenarios/source/*` does the same against workspace source, for the packages that
don't ship through `packages/kit` at all.

### `packages/kit/scripts/smoke-test.ts`

Installs a real `pnpm pack` tarball of `praxis-kit` into an isolated consumer directory and imports
every public subpath from it — the one place in the repo that tests against what actually ships to
npm, rather than a workspace link.

### The conformance suite (`lib/adapter-utils/src/testing`)

Every adapter runs the same behavioral contract — variant resolution, `as`, ARIA enforcement,
children contracts, SSR, hydration parity — against a shared conformance harness
(`make-conformance-adapter.ts` per adapter wires it up). Reading one adapter's conformance test file
alongside another's is a reasonable way to see the same component config exercised identically
across frameworks, which is what a runnable example would otherwise demonstrate.

### `qa/bench`

`qa/bench/src/tabs.bench.ts` compares a praxis-kit-built Tabs compound component against an
equivalent hand-rolled version in the same framework, with the same DOM structure and ARIA wiring —
the shape of component a real example would build, minus the dev server. Run it yourself for numbers
on your machine:

```bash
pnpm --filter @praxis-kit/bench bench:render
```

`qa/bench/src/render-pipeline.bench.ts`, `aria.bench.ts`, `children.bench.ts`, `factory.bench.ts`,
and `apply-filter.bench.ts` isolate each stage of the render pipeline described in
[ARCHITECTURE.md](../ARCHITECTURE.md#phase-2-render-time-once-per-component-render) individually.

```bash
pnpm --filter @praxis-kit/bench bench
```

## Worked examples

### Box — the Tailwind layout pipeline

A minimal `Box` demonstrating `createTailwindPipeline` end to end: a base class, size/tone variants,
a named preset, and the boolean display-mode props described in
[concepts.md](./concepts.md#tailwind-layout-pipeline-and-variant-naming).

```ts
import { createContractComponent } from 'praxis-kit/react'
import { createTailwindPipeline } from 'praxis-kit/tailwind'

const Box = createContractComponent({
  tag: 'div',
  styling: {
    plugin: createTailwindPipeline,
    base: 'rounded-lg border p-4',
    variants: {
      size: { sm: 'gap-2 text-sm', lg: 'gap-6 text-lg' },
      tone: { neutral: 'border-gray-200 bg-white', accent: 'border-blue-200 bg-blue-50' },
    },
    defaults: { size: 'sm', tone: 'neutral' },
    presets: {
      card: { size: 'lg', tone: 'accent' },
    },
  },
})
```

```tsx
// base + defaults only — no display mode, so flex-*/grid-* utilities in className are stripped
<Box className="grid-cols-3">Plain content</Box>

// flex mode — the pipeline prepends `flex` and strips grid-cols-3 (grid-family);
// flex-col and gap-4 survive
<Box flex className="flex-col gap-4 grid-cols-3">
  <span>One</span>
  <span>Two</span>
</Box>

// grid mode — the inverse: flex-col is stripped (a flex-family container property);
// grid-cols-3 and gap-4 survive (gap-* survives under either active family)
<Box grid className="grid-cols-3 gap-4 flex-col">
  <span>One</span>
  <span>Two</span>
</Box>

// the "card" preset — recipe selects size=lg, tone=accent; explicit props still win over it
<Box recipe="card" tone="neutral">
  Overridden back to neutral
</Box>
```

`Box` has no `enforcement` declared, so it costs nothing beyond the class pipeline itself — no ARIA
engine, no children evaluator instantiated. That's the deliberate contrast with the Tabs example
below: a primitive with real styling machinery but zero structural contracts, versus a compound
component that's almost entirely contracts.

### Tabs — the compound-component pattern

The general shape any of the seven adapters would use — enough to read alongside a conformance test
file or write your own:

```ts
import { createContractComponent } from 'praxis-kit/react'
import { isValidElement } from 'react'

const TabsList = createContractComponent({
  tag: 'div',
  name: 'Tabs.List',
  enforcement: {
    diagnostics: 'warn',
    aria: [], // built-in role/attribute rules run regardless
    children: [
      {
        name: 'Tabs.Trigger',
        match: (c) => isValidElement(c) && c.type === TabsTrigger,
        cardinality: { min: 1 },
      },
    ],
  },
})
```

- **praxis-kit** owns tag resolution, the class pipeline, ARIA roles, and the `Tabs.Trigger`
  cardinality contract above.
- **Framework state** — `useState`/`createContext` in React, `provide`/`inject` in Vue,
  `createSignal`/`createContext` in Solid, `setContext`/`getContext` in Svelte, a plain class field
  in Lit/Web — owns which tab is active and the show/hide logic. praxis-kit has no opinion on
  either.
