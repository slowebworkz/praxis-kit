# @praxis-kit/tailwind

A **semantic bridge between Praxis layout props and Tailwind utility classes**. It wraps the core
class pipeline with a display-aware resolver that manages CSS `display` values through boolean
shorthand props or a single-valued `layout` prop, strips utilities that can't apply under the active
display mode, and emits a deterministic class order.

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

With the plugin active, pass a display shorthand prop as a boolean or use the single-valued `layout`
prop to control the display mode. All CSS display values are reserved — the pipeline injects the
display class automatically and strips conflicting utilities based on the active family.
`layout="none"` means **do not inject a display class**; it does not mean `display: none`. Use
`layout="hidden"` to apply Tailwind's `hidden` class and set `display: none`.

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

### Composition with `compose.with`

When a Tailwind-enabled component is used as the direct `compose.with` partner, its plugin can be
selected for the combined styling pipeline even if the composing component has no plugin of its own.
The selected factory receives the merged styling options, so display props such as `flex` resolve
against both components' class contributions. If both components configure different plugin
factories, the primary component's factory wins and Praxis Kit reports `COMP1016`; plugin pipelines
are not chained together.

Plugin-owned layout props (`layout` and the boolean shorthand props) are inputs to class resolution,
not host attributes. They are reserved from normal forwarding and `compose.defaults`, including when
`compose.allProps` is enabled. The single-valued `layout` prop accepts any `layoutKeys` value plus
`'none'` (`'none'` means no display class; use `'hidden'` for `display: none`) and takes precedence
over boolean shorthand props when both are present. The name `layout` is reserved for display
selection and must not be used as a styling variant dimension; such a dimension is ignored with a
diagnostic. Invalid runtime values are warned about and ignored, falling back to boolean shorthand
props. This behavior applies only while automatic composition is active; an explicit `asChild` or
custom `render` path takes precedence. As usual, Tailwind CSS generation and source detection remain
the consuming application's build-time responsibility. For Tailwind v4, import the provided
stylesheet as described below so runtime-injected display classes have generated CSS.

### Tailwind v4 setup (required)

Display classes are assembled at runtime from `layout` or boolean shorthand props, so they never
appear as a literal string anywhere Tailwind's content scanner can find them — under Tailwind v4,
their CSS is never generated unless you explicitly safelist them. Import the safelist alongside
`tailwindcss` itself in your app's main CSS entry point:

```css
@import 'tailwindcss';
@import 'praxis-kit/tailwind.css';
```

Without this import, props like `<Button inline-block>` or `<Button layout="grid">` will not produce
any `display` CSS.

---

## Exports

| Export                                                          | Description                                                                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createTailwindPipeline`                                        | `ClassPluginFactory` — pass as `styling.plugin`; the runtime calls it                                                                             |
| `layoutKeys`                                                    | The canonical boolean layout-shorthand values (`flex`, `grid`, …); also read by `praxis-kit/vite-plugin`'s `designTokensPlugin`                   |
| `LayoutPropName` / `LayoutKeyName` (types)                      | `LayoutPropName` includes all plugin-owned props; `LayoutKeyName` names the boolean shorthand props only                                          |
| `LayoutProps<T>` / `LayoutKey<T>` / `ResolvedLayout<T>` (types) | The layout-prop shape a component gains from the pipeline — `LayoutProps<typeof layoutKeys>` — including boolean shorthands and `layout` override |

The classifier / dependency-evaluator / builder / layout-state classes and the
token/pipeline-context types are implementation detail of `createTailwindPipeline`, not part of the
public surface.
