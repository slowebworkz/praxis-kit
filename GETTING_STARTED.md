# Getting Started

This guide walks from a minimal working component to the full feature set, one step at a time. Each
step produces something you can render before the next layer of complexity is introduced.

---

## Installation

Pick the adapter for your framework. Every adapter depends on `@praxis-ui/core` — add both:

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

The rest of this guide uses the React adapter. The API is identical across frameworks; only the
import path changes.

---

## Step 1 — Your first component

The minimum required option is `tag`: the HTML element to render.

```ts
import { createContractComponent } from '@praxis-ui/react'

const Box = createContractComponent({ tag: 'div' })
```

```tsx
// renders: <div>Hello</div>
<Box>Hello</Box>
```

That's a working component. Every option from here is opt-in.

---

## Step 2 — A base class

`styling.base` is applied unconditionally on every render.

```ts
const Box = createContractComponent({
  tag: 'div',
  styling: { base: 'rounded border bg-white' },
})
```

```tsx
// renders: <div class="rounded border bg-white">…</div>
<Box>…</Box>
```

Pass a `className` prop to append additional classes:

```tsx
// renders: <div class="rounded border bg-white p-4">…</div>
<Box className="p-4">…</Box>
```

---

## Step 3 — Variants

Add named variant dimensions. Each variant key maps to a set of class strings.

```ts
const Box = createContractComponent({
  tag: 'div',
  styling: {
    base: 'rounded border',
    variants: {
      size: {
        sm: 'px-2 py-1 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
      },
      tone: {
        neutral: 'bg-white text-gray-900',
        primary: 'bg-blue-600 text-white',
      },
    },
    defaults: { size: 'md', tone: 'neutral' },
  },
})
```

```tsx
// defaults apply: size=md, tone=neutral
<Box>Content</Box>

// override one or both
<Box size="lg" tone="primary">Highlighted</Box>
```

Variant props are forwarded as classes only — they are not passed to the DOM element.

---

## Step 4 — Compound variants

Apply extra classes when a specific combination of variants is active.

```ts
styling: {
  variants: {
    size:   { sm: 'text-sm', lg: 'text-lg' },
    intent: { ghost: 'opacity-70', solid: 'shadow' },
  },
  compounds: [
    // class fires only when size=sm AND intent=ghost together
    { size: 'sm', intent: 'ghost', class: 'text-xs' },
  ],
},
```

Compounds fire across the preset boundary — a preset and a caller prop can together satisfy a
compound rule.

---

## Step 5 — Polymorphic rendering

Pass `as` to change the rendered element without changing the component's classes or props.

```tsx
const Button = createContractComponent({
  tag: 'button',
  styling: { base: 'btn', variants: { size: { sm: 'btn--sm', lg: 'btn--lg' } } },
})
```

```tsx
// renders <button class="btn">
<Button>Save</Button>

// renders <a class="btn" href="/">  — note href is now valid
<Button as="a" href="/">Home</Button>
```

TypeScript narrows the allowed props to match the active element. `href` is only valid when
`as="a"`.

---

## Step 6 — Accessibility contracts

`enforcement.strict` turns on built-in ARIA validation. The ARIA engine runs on every render and
corrects attribute problems before they reach the DOM.

```ts
const Nav = createContractComponent({
  tag: 'nav',
  enforcement: { strict: 'warn' },
})
```

```tsx
// <nav> already carries implicit role="navigation".
// The redundant attribute is stripped; a warning is emitted.
<Nav role="navigation" />

// role="region" is not a valid override for <nav>.
// The attribute is stripped before it reaches the DOM.
<Nav role="region" />
```

Two strictness levels:

| Value     | On violation                        |
| --------- | ----------------------------------- |
| `'warn'`  | `console.warn`, continues rendering |
| `'throw'` | throws at render time               |

---

## Step 7 — Structural contracts

`enforcement.children` validates which child types may appear and how many are allowed.

```tsx
import { isValidElement } from 'react'
import { createContractComponent } from '@praxis-ui/react'
import { CardHeader, CardBody } from './card-parts'

const Card = createContractComponent({
  tag: 'div',
  enforcement: {
    strict: 'throw',
    children: [
      {
        name: 'CardHeader',
        match: (c) => isValidElement(c) && c.type === CardHeader,
        cardinality: { min: 1, max: 1 },
      },
      {
        name: 'CardBody',
        match: (c) => isValidElement(c) && c.type === CardBody,
        cardinality: { min: 1 },
      },
    ],
  },
})
```

```tsx
// valid — one header, one body
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
</Card>

// throws — missing CardHeader
<Card>
  <CardBody>Content</CardBody>
</Card>
// Error: [Card] contract violation — expected exactly 1 CardHeader (got 0)
```

Use `strict: 'warn'` while developing and switch to `strict: 'throw'` for production contracts. Omit
`enforcement` entirely to skip all validation — zero runtime cost.

For standard HTML elements, `htmlContracts` from `@praxis-ui/core` provides ready-made rules so you
don't need to write `match` predicates by hand:

```ts
import { htmlContracts } from '@praxis-ui/core'

const List = createContractComponent({
  tag: 'ul',
  enforcement: htmlContracts.ul, // only li, script, template allowed as direct children
})

const Details = createContractComponent({
  tag: 'details',
  enforcement: htmlContracts.details, // summary (≤1, must be first) + any flow content
})
```

`htmlContracts` covers `ul`, `ol`, `table`, `thead`/`tbody`/`tfoot`, `tr`, `colgroup`, `dl`,
`select`, `optgroup`, `picture`, `figure`, `details`, and `fieldset`.

---

## Step 8 — Slot rendering with `asChild`

`asChild` merges the component's resolved props and classes onto its single child element instead of
rendering its own DOM node. The child's element type becomes the rendered tag.

```tsx
const Button = createContractComponent({
  tag: 'button',
  styling: { base: 'btn', variants: { size: { sm: 'btn--sm', lg: 'btn--lg' } } },
})
```

```tsx
// renders <a class="btn" href="/dashboard">  — Button's classes, anchor's element
<Button asChild>
  <a href="/dashboard">Dashboard</a>
</Button>
```

Use `Slottable` when the slot child wraps additional content that should receive the original
children:

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

## Step 9 — Named presets

Presets are partial variant selections bundled under a name. Useful for design-system tokens.

```ts
styling: {
  variants: {
    size:   { sm: 'btn--sm',      lg: 'btn--lg'    },
    intent: { ghost: 'btn--ghost', solid: 'btn--solid' },
  },
  defaults: { size: 'lg', intent: 'solid' },
  presets: {
    secondary: { size: 'sm', intent: 'ghost' },
  },
},
```

```tsx
// activates size=sm, intent=ghost; caller can still override either
<Button variantKey="secondary" size="lg">
  Submit
</Button>
```

---

## React 18

Import from the `/legacy` sub-path. The API is identical — the adapter wraps in `forwardRef` for
React 18 compatibility.

```ts
import { createContractComponent } from '@praxis-ui/react/legacy'
```

---

## Tailwind layout-aware classes

`@praxis-ui/tailwind` provides a class pipeline plugin that filters layout utilities based on the
active layout mode. Install separately:

```bash
pnpm add @praxis-ui/tailwind
```

```ts
import { createTailwindPipeline } from '@praxis-ui/tailwind'

const Box = createContractComponent({
  tag: 'div',
  styling: {
    plugin: createTailwindPipeline,
    base: 'rounded p-4',
    variants: {
      direction: { row: 'flex-row', col: 'flex-col' },
      gap:       { sm: 'gap-2', lg: 'gap-6' },
    },
  },
})

// flex mode — grid-cols-* is stripped automatically
<Box flex className="flex-col gap-4 grid-cols-3">…</Box>

// grid mode — flex-col, grow, shrink-* are stripped automatically
<Box grid className="grid-cols-3 gap-4 flex-col">…</Box>
```

---

## What's next

- [ARCHITECTURE.md](ARCHITECTURE.md) — internal runtime pipeline, data flow, execution phases, and
  debugging guide (`diagnoseClassPipeline`, ARIA violation messages, child evaluator traces)
- [ADAPTER_AUTHORING.md](ADAPTER_AUTHORING.md) — writing a new framework adapter against the core
  contract
- [MIGRATING.md](MIGRATING.md) — step-by-step guides from CVA, Radix Slot, and Chakra UI
- [README.md](README.md) — full `FactoryOptions` reference and positioning overview
