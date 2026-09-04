# @praxis-kit/tailwind

A **semantic bridge between Praxis layout props and Tailwind utility classes**. It wraps the core
class pipeline with a display-aware resolver that manages every CSS `display` value as a reserved
boolean prop, strips utilities that can't apply under the active display mode, and emits a
deterministic class order.

Under the hood it is a small layout-aware CSS resolution engine —
`ClassClassifier → ClassifiedToken → LayoutState → DependencyEvaluator → ClassBuilder` — not a
general-purpose Tailwind parser. Classification is **Tailwind-aware but lexical** (`ITEM_PREFIXES`
matches `grow-*`, `order-*`, … by prefix); it does not resolve your Tailwind config. Anything it
can't classify is passed through untouched.

## The `family` model

`LayoutState` reduces the display mode to a filtering **family**: `flex` (from `flex` /
`inline-flex`), `grid` (from `grid` / `inline-grid`), or `none` for everything else (`block`,
`table`, `contents`, `hidden`, no prop, …). `none` means **"not a flex/grid formatting context"**,
not `display: none` — flex- and grid-dependent utilities are stripped for all of it. Item-context
utilities (`self-*`, `order-*`, `grow`, `col-*`, …) describe the element inside _its parent's_
formatting context, so they are **never** stripped by the element's own mode.

---

## Installation

```bash
pnpm add @praxis-kit/tailwind
```

---

## Usage

`styling.plugin` expects a `ClassPluginFactory` — a function the runtime calls internally with the
component's resolved pipeline options and strict mode. Pass `createTailwindPipeline` as a **function
reference**. Do not call it yourself.

```ts
import { createContractComponent } from '@praxis-kit/react'
import { createTailwindPipeline } from '@praxis-kit/tailwind'

// CORRECT — pass the reference; the runtime calls it
const Button = createContractComponent({
  tag: 'button',
  styling: {
    base: 'items-center rounded',
    variants: {
      size: { sm: 'px-2 py-1 text-sm', lg: 'px-4 py-2 text-base' },
    },
    defaults: { size: 'sm' },
    plugin: createTailwindPipeline,
  },
})

// WRONG — calling it manually produces a ClassPlugin where a ClassPluginFactory is expected
const Button = createContractComponent({
  tag: 'button',
  styling: {
    plugin: createTailwindPipeline({ base: 'items-center' }, false), // ❌
  },
})
```

With the plugin active, pass any display prop as a boolean to control the display mode. All CSS
display values are reserved — the pipeline injects the display class automatically and strips
conflicting utilities based on the active family:

| Prop                                                                                         | CSS class injected   | Strips                                                   |
| -------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------- |
| `flex`                                                                                       | `flex`               | `grid-*`, `col-*`, `row-*`, `auto-cols-*`, `auto-rows-*` |
| `inline-flex`                                                                                | `inline-flex`        | same as `flex`                                           |
| `grid`                                                                                       | `grid`               | `flex-*`, `grow`, `shrink`, `basis-*`                    |
| `inline-grid`                                                                                | `inline-grid`        | same as `grid`                                           |
| `block`, `inline-block`, `inline`, `hidden`, `contents`, `flow-root`, `list-item`, `table-*` | (matching CSS class) | both flex-family and grid-family utilities               |
| _(no prop)_                                                                                  | nothing              | both flex-family and grid-family utilities               |

```tsx
<Button flex>Click me</Button>          // injects "flex", strips grid-*
<Button inline-flex>Click me</Button>   // injects "inline-flex", strips grid-*
<Button grid>Click me</Button>          // injects "grid", strips flex-*
<Button block>Click me</Button>         // injects "block", strips flex-* and grid-*
```

Do not pass display classes as literal strings in `base`, `variants`, or `className` — the pipeline
will warn (when `strict` is enabled) and strip them in favour of the prop-controlled value.

### Tailwind v4 setup (required)

Display classes are assembled at runtime from boolean props, so they never appear as a literal
string anywhere Tailwind's content scanner can find them — under Tailwind v4, their CSS is never
generated unless you explicitly safelist them. Import the safelist alongside `tailwindcss` itself in
your app's main CSS entry point:

```css
@import 'tailwindcss';
@import 'praxis-kit/tailwind.css';
```

Without this import, props like `<Button inline-block>` will not produce any `display` CSS.

---

## Exports

| Export                   | Description                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `createTailwindPipeline` | `ClassPluginFactory` — pass as `styling.plugin` reference; the runtime calls it               |
| `ClassBuilder`           | Assembles the final class string from classified tokens; sorts layout tokens before utilities |
| `ClassClassifier`        | Parses a class token into one of: `layout`, `conditional`, `gap`, or `utility`                |
| `DependencyEvaluator`    | Decides whether a token survives the active layout mode using configurable regex rules        |
| `defaultDependencyRules` | Built-in rules: strips `flex-*`/`grow`/`shrink`/`basis-*` in grid mode and vice versa         |
| `LayoutState`            | Tracks the active display mode and its filtering family for a single pipeline invocation      |
