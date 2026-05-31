# praxis-ui

**Prevent invalid component composition.**

Write component rules once. Enforce them in React, Vue, Svelte, Solid, and Preact.

---

## Who this is for

Praxis UI is infrastructure for **design system authors** — teams building a component library that
needs to work across multiple frameworks and hold up over time.

If you are building a single Button component for a single React app, you don't need this.

If you are building Tabs, Dialogs, Accordions, and Menus that need to:

- reject invalid structure before it reaches the DOM
- strip incorrect ARIA attributes automatically
- work identically in React and Vue without duplicating logic

…this is built for that.

---

## The problems it solves

### Problem 1 — Your Tabs component silently accepts wrong children

```tsx
// This renders. Nothing breaks immediately.
// But the user sees broken UI because TabsList is missing.
<Tabs>
  <TabsTrigger value="a">First</TabsTrigger>
  <TabsTrigger value="b">Second</TabsTrigger>
</Tabs>
```

TypeScript won't catch this. The type is `ReactNode` — anything is valid. The bug reaches QA, or
production.

**With Praxis UI:**

```tsx
// This throws immediately at render time.
// Error: [Tabs] TabsList is required (got 0). TabsPanel is required (got 0).
<Tabs>
  <TabsTrigger value="a">First</TabsTrigger>
</Tabs>
```

---

### Problem 2 — Invalid ARIA attributes reach the DOM

```tsx
// Redundant: <nav> already has an implicit role="navigation".
// This renders role="navigation" into the HTML anyway.
<nav role="navigation">…</nav>

// Invalid override — permitted roles for <nav> don't include "region".
// This also renders without complaint.
<nav role="region">…</nav>
```

Screen readers and audit tools flag these. They're subtle and they slip through code review.

**With Praxis UI:**

Both attributes are stripped before the DOM is touched. In strict mode, a warning is emitted. No
false positives — the engine knows which roles are implicit and which overrides are valid.

---

### Problem 3 — You support React today but need Vue tomorrow

You've built your design system. Now a project needs Vue. Your options are:

- Copy every component and maintain two codebases in sync
- Pick a headless library that has its own Vue bindings (which may not match your React version)
- Abstract at the design token level and rebuild rendering in each framework

**With Praxis UI:**

```ts
// tabs-contract.ts — define the rules once
export const tabsContract = {
  tag: 'div',
  enforcement: {
    strict: 'throw',
    children: [
      { name: 'TabsList', match: isTabsList, cardinality: { min: 1, max: 1 } },
      { name: 'TabsPanel', match: isTabsPanel, cardinality: { min: 1 } },
    ],
  },
}
```

```ts
// React
import { createContractComponent } from '@praxis-ui/react'
export const Tabs = createContractComponent(tabsContract)
```

```ts
// Vue — one import changes. Everything else is identical.
import { createContractComponent } from '@praxis-ui/vue'
export const Tabs = createContractComponent(tabsContract)
```

The validation logic, ARIA normalization, and class pipeline live in one place. Not in the React
binding. Not in the Vue binding. In `@praxis-ui/core`.

---

## "Won't runtime validation be slow?"

**Structural validation is development-only.** It runs behind a
`process.env.NODE_ENV !== 'production'` gate and is completely absent from production builds. Zero
cost.

**Class resolution is cached.** An LRU cache skips re-evaluation when the same variant props appear
on re-render. The full render pipeline (tag resolution + prop merge + class resolution) runs in
under a microsecond on warm cache. Run `pnpm bench` to see numbers on your machine.

---

## "Why not TypeScript?"

TypeScript catches type errors at compile time. Structural violations — wrong children, wrong
nesting, missing required elements — happen at runtime and produce no TypeScript errors. Both are
useful; they catch different things.

```tsx
// TypeScript accepts this. It's a valid ReactNode.
// The bug is structural, not type-level.
<Tabs>
  <p>This is not a TabsList.</p>
</Tabs>
```

---

## "Will you keep up with five frameworks?"

Maintaining parity across five frameworks is the real cost of this approach. The architecture
reduces it: validation logic lives in `@praxis-ui/core` and is shared. A bug fix there fixes all
five adapters simultaneously. The conformance suite runs 90+ behavioral contracts against every
adapter on every commit.

That said — if a major framework makes a breaking API change, updating all five adapters takes real
work. This is a genuine maintenance commitment, not a solved problem.

---

## Installation

```bash
# React
pnpm add @praxis-ui/react @praxis-ui/core

# Vue 3
pnpm add @praxis-ui/vue @praxis-ui/core

# Solid
pnpm add @praxis-ui/solid @praxis-ui/core

# Preact
pnpm add @praxis-ui/preact @praxis-ui/core

# Svelte 5
pnpm add @praxis-ui/svelte @praxis-ui/core
```

---

## Quick example

A Button with variants, strict enforcement, and framework portability:

```tsx
import { createContractComponent } from '@praxis-ui/react'

const Button = createContractComponent({
  tag: 'button',
  styling: {
    base: 'btn',
    variants: {
      size:   { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
      intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
    },
    defaults: { size: 'md', intent: 'primary' },
  },
  enforcement: { strict: 'warn' },
})

// <button class="btn btn--md btn--primary">Save</button>
<Button>Save</Button>

// <a class="btn btn--lg btn--ghost"> — renders as <a>, not <button>
<Button as="a" href="/" size="lg" intent="ghost">Home</Button>
```

Variant props (`size`, `intent`) are filtered before reaching the DOM. `as` is resolved and
stripped. `className` is handled. You write the contract; the runtime handles the rest.

---

## Core features

### Structural enforcement

Declare which children are valid and how many are allowed. Evaluated on every render in development,
stripped in production.

```ts
enforcement: {
  strict: 'throw',   // or 'warn' to console.warn instead of throwing
  children: [
    { name: 'TabsList',  match: isTabsList,  cardinality: { min: 1, max: 1 } },
    { name: 'TabsPanel', match: isTabsPanel, cardinality: { min: 1 } },
  ],
}
```

### ARIA normalization

The built-in engine validates role assignments against each element's implicit landmark role and
strips invalid or redundant attributes before they reach the DOM.

### Class variants

Powered by CVA internally. Base classes, per-prop variants, compound rules, named presets, and
tag-specific overrides. Variant keys are filtered from DOM props automatically.

### `asChild` slot rendering

Merge resolved props and classes onto a child element instead of rendering a new DOM node —
following the Radix Slot pattern, available in every framework.

### HTML5 built-in contracts

```ts
import { htmlContracts } from '@praxis-ui/core'

const List = createContractComponent({ tag: 'ul', enforcement: htmlContracts.ul })
const Table = createContractComponent({ tag: 'table', enforcement: htmlContracts.table })
```

Pre-defined rules for `ul`, `ol`, `table`, `figure`, `details`, `fieldset`, and more. The companion
ESLint rule `@praxis-ui/no-invalid-html-nesting` catches the same violations statically.

---

## Packages

| Package                                    | Description                                                 |
| ------------------------------------------ | ----------------------------------------------------------- |
| [`@praxis-ui/core`](packages/core)         | Validation engine, class pipeline, ARIA normalizer, factory |
| [`@praxis-ui/react`](packages/react)       | React 19+ · `/legacy` sub-path for React 18                 |
| [`@praxis-ui/vue`](packages/vue)           | Vue 3                                                       |
| [`@praxis-ui/solid`](packages/solid)       | Solid · client and SSR                                      |
| [`@praxis-ui/preact`](packages/preact)     | Preact                                                      |
| [`@praxis-ui/svelte`](packages/svelte)     | Svelte 5                                                    |
| [`@praxis-ui/tailwind`](packages/tailwind) | Layout-aware Tailwind class pipeline plugin                 |

---

## vs. other tools

|                 | Ships components | Structural enforcement  | Single runtime across frameworks |
| --------------- | ---------------- | ----------------------- | -------------------------------- |
| **Radix UI**    | Yes              | No                      | No — React only                  |
| **Headless UI** | Yes              | No                      | No — React + Vue separately      |
| **Ark UI**      | Yes              | Partial (state machine) | No — bindings are independent    |
| **CVA**         | No               | No                      | No — class strings only          |
| **Praxis UI**   | No — rules only  | Yes — declarative       | Yes — one engine                 |

CVA solves variant class strings. Praxis UI wraps that with enforcement, ARIA normalization, prop
filtering, and framework portability. If you keep rebuilding those pieces on top of CVA, that gap is
what this fills.

---

## Further reading

- [GETTING_STARTED.md](GETTING_STARTED.md) — step-by-step from a minimal component to enforcement
  and slot rendering
- [ARCHITECTURE.md](ARCHITECTURE.md) — runtime pipeline, caching, and data flow
- [MIGRATING.md](MIGRATING.md) — from CVA, Radix Slot, or a full component library
- [ADAPTER_AUTHORING.md](ADAPTER_AUTHORING.md) — writing a new framework adapter

---

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm bench     # render pipeline and children matcher benchmarks
```

---

## License

MIT
