# Examples

There is no `examples/*` workspace yet — a runnable Box/Button/Tabs dev server per adapter, the way
`../pk` ships one, hasn't landed in this repo. See `DECISIONS.md` for current status. This document
covers what exists today as the closest thing to a worked example, and will be replaced with the
real per-adapter walkthroughs once `examples/*` lands.

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

## What a Tabs-style compound component looks like

The general shape any of the seven adapters would use — enough to read alongside a conformance test
file or write your own before `examples/*` exists:

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
