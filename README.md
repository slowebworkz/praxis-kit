# praxis-ui

A semantic runtime for component systems.

Praxis UI defines which elements may render, how they compose, and which accessibility rules apply.
The same validation runs in every framework.

---

## Three concepts

1. Define a semantic contract. One configuration object declares the tag, variant classes, ARIA
   rules, and structural invariants for a component.

2. Bind to any framework. Change one import. The semantic runtime (validation, class resolution,
   ARIA normalization) runs identically in React, Vue, Solid, Svelte, and Preact.

3. Invalid UI cannot render silently. Structural violations throw or warn at render time, before
   anything reaches the DOM.

```tsx
// This throws:
<Tabs>
  <Tabs.Trigger value="a">First</Tabs.Trigger>
</Tabs>
// Error: [Tabs] contract violation — expected exactly 1 Tabs.List (got 0), at least 1 Tabs.Panel (got 0)
```

The contract that produced it:

```tsx
const Tabs = createContractComponent({
  tag: 'div',
  enforcement: {
    strict: 'throw',
    children: [
      { name: 'Tabs.List', match: isTabList, cardinality: { min: 1, max: 1 } },
      { name: 'Tabs.Panel', match: isTabPanel, cardinality: { min: 1 } },
    ],
  },
})
```

---

## Architecture

```text
Your component definition
    createContractComponent(options)
              │
              ▼
  ┌───────────────────────┐
  │   @praxis-ui/core     │  ← semantic runtime
  │                       │
  │  class pipeline       │   base · variants · tag-map · compounds
  │  ARIA engine          │   role normalization · redundancy stripping
  │  structural validator │   invariants · cardinality rules
  └──────────┬────────────┘
             │  framework bindings — no runtime logic
     ┌───────┼───────┬──────────┬──────────┐
     ▼       ▼       ▼          ▼          ▼
  React     Vue   Svelte     Solid      Preact
```

The semantic runtime lives entirely in `@praxis-ui/core`. Framework packages are bindings: they
translate each framework's rendering model into calls against the runtime. No validation logic is
duplicated across them.

---

## Not a component library

Radix UI, Headless UI, and Ark UI ship pre-built components (tabs, dialogs, menus) with
accessibility handling baked into each one individually. You adopt their structure.

Praxis UI ships none of that. It is the semantic runtime that a design system's components are built
on: the validation layer, ARIA guarantees, and class pipeline, without prescribing what those
components are.

| Library         | Ships components  | Structural validation   | Shared runtime across frameworks |
| --------------- | ----------------- | ----------------------- | -------------------------------- |
| **Radix UI**    | Yes               | Partial, implicit       | No — React only                  |
| **Headless UI** | Yes               | No                      | No — React + Vue separately      |
| **Ark UI**      | Yes               | Partial, state machine  | No — bindings are independent    |
| **Praxis UI**   | No — runtime only | Yes — declarative rules | Yes — bindings share one runtime |

"Partial" means structure is validated incidentally, as a side effect of the component's
implementation. You cannot add an invariant, change a cardinality rule, or extend the validation
layer. The library owns the shape; you follow it.

### Why do structural guarantees require a runtime?

Structural misuse (wrong children, invalid ARIA, composition violations) produces no TypeScript
errors. It produces broken DOM and accessibility failures that only surface in a browser, often only
under specific usage patterns. A runtime validation layer catches these at render time, before they
reach QA or production. `strict: 'throw'` hard-fails the render; `strict: 'warn'` surfaces
violations without interrupting the render cycle.

### Why are framework packages bindings, not runtimes?

If validation logic lived in the React binding, it would have to be duplicated in the Vue binding,
the Solid binding, and every binding added later. A bug fix or rule change would mean coordinated
changes across five packages. Keeping the semantic runtime in `@praxis-ui/core` means one
implementation with identical behaviour in every framework. Bindings only translate the framework's
rendering model into calls against the runtime.

---

## One runtime, any framework

Define the contract once:

```ts
// tabs-contract.ts
export const tabsContract = {
  tag: 'div',
  enforcement: {
    strict: 'throw',
    children: [
      { name: 'Tabs.List', match: isTabList, cardinality: { min: 1, max: 1 } },
      { name: 'Tabs.Panel', match: isTabPanel, cardinality: { min: 1 } },
    ],
  },
}
```

One import changes per framework. Everything else is identical:

```ts
// React
import { createContractComponent } from '@praxis-ui/react'
export const Tabs = createContractComponent(tabsContract)
```

```ts
// Vue
import { createContractComponent } from '@praxis-ui/vue'
export const Tabs = createContractComponent(tabsContract)
```

```ts
// Solid
import { createContractComponent } from '@praxis-ui/solid'
export const Tabs = createContractComponent(tabsContract)
```

```ts
// Preact
import { createContractComponent } from '@praxis-ui/preact'
export const Tabs = createContractComponent(tabsContract)
```

Render an invalid tree in any of them:

```tsx
<Tabs>
  <Tabs.Trigger value="a">First</Tabs.Trigger>
</Tabs>
```

```text
Error: [Tabs] contract violation — expected exactly 1 Tabs.List (got 0), at least 1 Tabs.Panel (got 0)
```

Same error. Same message. Same throw. The semantic runtime never crossed the binding boundary.

---

## Packages

| Package                                    | Description                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| [`@praxis-ui/core`](packages/core)         | Semantic runtime — class pipeline, ARIA engine, structural validator, factory |
| [`@praxis-ui/react`](packages/react)       | React binding · React 19+ · `/legacy` sub-path for React 18                   |
| [`@praxis-ui/vue`](packages/vue)           | Vue 3 binding                                                                 |
| [`@praxis-ui/solid`](packages/solid)       | Solid binding · client and SSR                                                |
| [`@praxis-ui/preact`](packages/preact)     | Preact binding                                                                |
| [`@praxis-ui/svelte`](packages/svelte)     | Svelte binding                                                                |
| [`@praxis-ui/tailwind`](packages/tailwind) | Layout-aware class pipeline plugin                                            |

---

## Installation

```bash
pnpm add @praxis-ui/react @praxis-ui/core
```

---

## Contracts

### Structural contracts

Declare which children are valid and how many are allowed. The evaluator runs on every render.

```tsx
import { isValidElement } from 'react'
import { createContractComponent } from '@praxis-ui/react'
import { PrimaryAction, SecondaryAction } from './actions'

const ActionBar = createContractComponent({
  tag: 'div',
  styling: { base: 'flex gap-2' },
  enforcement: {
    strict: 'throw',
    children: [
      { name: 'PrimaryAction',   match: (c) => isValidElement(c) && c.type === PrimaryAction,   cardinality: { min: 1, max: 1 } },
      { name: 'SecondaryAction', match: (c) => isValidElement(c) && c.type === SecondaryAction, cardinality: { max: 3 } },
    ],
  },
})

// ✓ valid
<ActionBar>
  <PrimaryAction>Save</PrimaryAction>
  <SecondaryAction>Cancel</SecondaryAction>
</ActionBar>

// ✗ throws — two PrimaryAction elements
<ActionBar>
  <PrimaryAction>Save</PrimaryAction>
  <PrimaryAction>Submit</PrimaryAction>
</ActionBar>
```

`strict: 'warn'` surfaces violations as console warnings instead of throwing. Omit `enforcement`
entirely to skip all validation; there is no runtime cost.

#### HTML5 built-in contracts

`htmlContracts` from `@praxis-ui/core` provides ready-made enforcement for standard HTML elements
with restricted content models — no custom `match` predicates required:

```ts
import { htmlContracts } from '@praxis-ui/core'
import { createContractComponent } from '@praxis-ui/react'

const List = createContractComponent({ tag: 'ul', enforcement: htmlContracts.ul })
const Table = createContractComponent({ tag: 'table', enforcement: htmlContracts.table })
const Figure = createContractComponent({ tag: 'figure', enforcement: htmlContracts.figure })
```

```tsx
// ✗ warns — <div> is not a valid direct child of <ul>
<List><div>bad</div></List>

// ✗ warns — <p> is not a valid direct child of <table>
<Table><p>bad</p></Table>

// ✗ warns — <figure> allows at most one <figcaption>
<Figure>
  <img src="photo.jpg" alt="" />
  <figcaption>First</figcaption>
  <figcaption>Second</figcaption>
</Figure>
```

Available for `ul`, `ol`, `table`, `thead`/`tbody`/`tfoot`, `tr`, `colgroup`, `dl`, `select`,
`optgroup`, `picture`, `figure`, `details`, and `fieldset`. All default to `strict: 'warn'`. The
companion ESLint rule `@praxis-ui/no-invalid-html-nesting` catches the same violations statically at
author time.

### Accessibility contracts

The built-in ARIA engine validates role assignments against the element's implicit landmark role and
strips invalid or redundant attributes before they reach the DOM.

```tsx
const Nav = createContractComponent({
  tag: 'nav',
  enforcement: { strict: 'warn' },
})

// <nav> already has an implicit role="navigation".
// The redundant attribute is stripped; a warning is emitted in strict mode.
<Nav role="navigation" />

// Invalid override — <nav role="region"> is not a permitted override.
// The attribute is stripped before it reaches the DOM.
<Nav role="region" />
```

Custom ARIA rules can extend the built-in engine via `enforcement.aria`.

### Class contracts — variants and composition

```tsx
const Button = createContractComponent<'button', { loading?: boolean }>({
  tag: 'button',
  styling: {
    base: 'btn',
    variants: {
      size:   { sm: 'btn--sm',   md: 'btn--md',      lg: 'btn--lg' },
      intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
    },
    defaults: { size: 'md', intent: 'primary' },
    compounds: [
      { size: 'sm', intent: 'primary', class: 'btn--sm-primary' },
    ],
  },
  filterProps: (key, variantKeys) => variantKeys.has(key) || key === 'loading',
})

// <button class="btn btn--md btn--primary">
<Button>Save</Button>

// <a class="btn btn--lg btn--ghost">  — renders as <a>, not <button>
<Button as="a" href="/" size="lg" intent="ghost">Home</Button>
```

Named presets bundle variant selections for reuse:

```tsx
styling: {
  presets: {
    compact: { size: 'sm', intent: 'ghost' },
  },
},

// activates the compact preset
<Button variantKey="compact" />
```

---

## `asChild` — slot rendering

When `asChild` is `true`, the component merges its resolved props and classes onto its single child
element instead of rendering its own DOM node.

```tsx
// Renders an <a>. Button's resolved className merges onto the anchor.
<Button asChild>
  <a href="/dashboard">Dashboard</a>
</Button>
```

Use `Slottable` when the slot child needs to wrap additional content:

```tsx
import { Slottable } from '@praxis-ui/react'
;<Button asChild>
  <a href="/dashboard">
    <span aria-hidden>→</span>
    <Slottable>Dashboard</Slottable>
  </a>
</Button>
```

---

## React 18

Import from the `/legacy` sub-path. API is identical; the adapter wraps in `forwardRef` for React 18
compatibility.

```ts
import { createContractComponent } from '@praxis-ui/react/legacy'
```

---

## Tailwind

```bash
pnpm add @praxis-ui/tailwind
```

`createTailwindPipeline` filters layout-specific utility classes based on the active layout mode
(`flex` or `grid`).

```tsx
import { createTailwindPipeline } from '@praxis-ui/tailwind'

const Box = createContractComponent({
  styling: { plugin: createTailwindPipeline, base: 'rounded p-4' },
})

// flex mode — grid-cols-* stripped automatically
<Box flex className="flex-col gap-4 grid-cols-3">…</Box>

// grid mode — flex-col, grow, shrink-* stripped automatically
<Box grid className="grid-cols-3 gap-4 flex-col">…</Box>
```

---

## Why not X?

### Why not CVA?

[CVA](https://cva.style) produces a class string. You still wire up tag resolution, prop forwarding,
ARIA normalization, and child validation yourself. `praxis-ui` uses CVA internally for variant
resolution and adds the surrounding infrastructure. If you find yourself rebuilding those pieces on
top of CVA, that is the gap this fills.

→ [Migrating from CVA](MIGRATING.md#migrating-from-cva)

### Why not Radix Slot?

[Radix Slot](https://www.radix-ui.com/primitives/docs/utilities/slot) solves `asChild` prop merging
for React. This library's `asChild` implementation follows the same model, but the contract layer
above it (structural validation, ARIA normalization, framework portability) is out of scope for
Slot.

→ [Migrating from Radix Slot](MIGRATING.md#migrating-from-radix-slot--aschild)

### Why not a component library?

A component library enforces its own constraints. `praxis-ui` is infrastructure: it provides the
enforcement, normalization, and composition primitives that your design system's components are
built on, in any framework.

→ [Migrating from Chakra UI](MIGRATING.md#migrating-from-chakra-ui-or-any-full-component-library)

---

## Further reading

- [GETTING_STARTED.md](GETTING_STARTED.md) — step-by-step tutorial from a minimal component through
  variants, enforcement, and slot rendering
- [ARCHITECTURE.md](ARCHITECTURE.md) — runtime pipeline, data flow, type system, and debugging guide
- [ADAPTER_AUTHORING.md](ADAPTER_AUTHORING.md) — writing a new framework adapter against the core
  runtime contract
- [MIGRATING.md](MIGRATING.md) — migration guides from CVA, Radix Slot, and Chakra UI

---

## Development

```bash
pnpm install
pnpm typecheck     # type-check all packages
pnpm test          # run all tests
pnpm build         # build all packages
pnpm lint          # ESLint across workspace
pnpm format        # Prettier across workspace
pnpm arch:validate # enforce lib/ → packages/ dependency rules
pnpm bench         # run benchmark suites
```

---

## License

MIT
