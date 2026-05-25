# polymorphic-ui

Framework-neutral semantic UI contracts.

Define a component once. Enforce its structure, accessibility rules, and class composition in a
single configuration — across every framework.

---

## The idea in one example

```tsx
const Tabs = createPolymorphicComponent({
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

That configuration declares a _contract_. At render time:

- **Invalid children throw** — wrong types, wrong count, wrong order
- **Roles normalize automatically** — `<nav role="navigation">` strips the redundant attribute
  without any handler code
- **Semantics validate automatically** — invalid role overrides are caught and reported before they
  reach the DOM

The enforcement logic lives in `@polymorphic-ui/core`. The React, Vue, Svelte, Solid, and Preact
adapters are thin rendering wrappers — they carry no enforcement logic of their own.

---

## Architecture

```text
Your component definition
    createPolymorphicComponent(options)
              │
              ▼
  ┌───────────────────────┐
  │  @polymorphic-ui/core │   ← enforcement lives here
  │                       │
  │  class pipeline       │   base · variants · tag-map · compounds
  │  ARIA engine          │   role normalization · redundancy stripping
  │  child evaluator      │   structural contracts · cardinality rules
  └──────────┬────────────┘
             │  thin render adapters — no enforcement logic
     ┌───────┼───────┬──────────┬──────────┐
     ▼       ▼       ▼          ▼          ▼
  React     Vue   Svelte     Solid      Preact
```

This separation is what makes the library a _runtime architecture_ rather than a React utility. The
same contract definition produces identical enforcement behavior on every framework because
enforcement never enters the adapter layer.

---

## Packages

| Package                                         | Description                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| [`@polymorphic-ui/core`](packages/core)         | Framework-agnostic runtime — factory, class pipeline, ARIA engine, child evaluator |
| [`@polymorphic-ui/react`](packages/react)       | React adapter · React 19+ · `/legacy` sub-path for React 18                        |
| [`@polymorphic-ui/vue`](packages/vue)           | Vue 3 adapter                                                                      |
| [`@polymorphic-ui/tailwind`](packages/tailwind) | Layout-aware class pipeline plugin                                                 |
| [`@polymorphic-ui/solid`](packages/solid)       | Solid adapter · client and SSR                                                     |
| [`@polymorphic-ui/preact`](packages/preact)     | Preact adapter                                                                     |
| [`@polymorphic-ui/svelte`](packages/svelte)     | Svelte adapter                                                                     |

---

## Installation

```bash
pnpm add @polymorphic-ui/react @polymorphic-ui/core
```

---

## Contracts

### Structural contracts

Declare which children are valid and how many are allowed. The evaluator runs on every render.

```tsx
import { isValidElement } from 'react'
import { createPolymorphicComponent } from '@polymorphic-ui/react'
import { PrimaryAction, SecondaryAction } from './actions'

const ActionBar = createPolymorphicComponent({
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
entirely to skip all validation — zero cost at runtime.

### Accessibility contracts

The built-in ARIA engine validates role assignments against the element's implicit landmark role and
strips invalid or redundant attributes before they reach the DOM.

```tsx
const Nav = createPolymorphicComponent({
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
const Button = createPolymorphicComponent<'button', { loading?: boolean }>({
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
import { Slottable } from '@polymorphic-ui/react'

;<Button asChild>
  <a href="/dashboard">
    <span aria-hidden>→</span>
    <Slottable>Dashboard</Slottable>
  </a>
</Button>
```

---

## Tailwind

```bash
pnpm add @polymorphic-ui/tailwind
```

`createTailwindPipeline` filters layout-specific utility classes based on the active layout mode
(`flex` or `grid`).

```tsx
import { createTailwindPipeline } from '@polymorphic-ui/tailwind'

const Box = createPolymorphicComponent({
  styling: { plugin: createTailwindPipeline, base: 'rounded p-4' },
})

// flex mode — grid-cols-* stripped automatically
<Box flex className="flex-col gap-4 grid-cols-3">…</Box>

// grid mode — flex-col, grow, shrink-* stripped automatically
<Box grid className="grid-cols-3 gap-4 flex-col">…</Box>
```

---

## React 18

Import from the `/legacy` sub-path. API is identical; the adapter wraps in `forwardRef` for React 18
compatibility.

```ts
import { createPolymorphicComponent } from '@polymorphic-ui/react/legacy'
```

---

## Why not X?

### Why not CVA?

[CVA](https://cva.style) produces a class string. You still wire up tag resolution, prop forwarding,
ARIA normalization, and child validation yourself. `polymorphic-ui` uses CVA internally for variant
resolution and adds the surrounding infrastructure. If you find yourself rebuilding those pieces on
top of CVA, that is the gap this fills.

→ [Migrating from CVA](MIGRATING.md#migrating-from-cva)

### Why not Radix Slot?

[Radix Slot](https://www.radix-ui.com/primitives/docs/utilities/slot) solves `asChild` prop merging
for React. This library's `asChild` implementation is modeled on Radix Slot — but the contract layer
above it (structural validation, ARIA normalization, framework portability) is out of scope for
Slot.

→ [Migrating from Radix Slot](MIGRATING.md#migrating-from-radix-slot--aschild)

### Why not a component library?

A component library enforces its own constraints. `polymorphic-ui` is infrastructure — it provides
the enforcement, normalization, and composition primitives that your design system's components are
built on top of, in any framework.

→ [Migrating from Chakra UI](MIGRATING.md#migrating-from-chakra-ui-or-any-full-component-library)

---

## Further reading

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
