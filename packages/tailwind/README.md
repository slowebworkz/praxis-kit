# @praxis-kit/tailwind

Tailwind CSS integration for praxis-kit — layout-aware class pipeline with variant composition.

Wraps the core class pipeline with a layout-aware resolver that handles `flex`/`grid` boolean props,
strips conflicting layout utilities, and ensures a deterministic class order.

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
    base: 'inline-flex items-center rounded',
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
    plugin: createTailwindPipeline({ base: 'inline-flex' }, false), // ❌
  },
})
```

With the plugin active, pass `flex` or `grid` as boolean props to control the display mode. The
pipeline injects the display class automatically and strips conflicting layout utilities (e.g.
`grid-*` classes are removed in flex mode):

```tsx
<Button flex>Click me</Button>  // renders with class="flex inline-flex items-center ..."
<Button grid>Click me</Button>  // renders with class="grid inline-flex items-center ..."
```

---

## Exports

| Export                   | Description                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `createTailwindPipeline` | `ClassPluginFactory` — pass as `styling.plugin` reference; the runtime calls it               |
| `ClassBuilder`           | Assembles the final class string from classified tokens; sorts layout tokens before utilities |
| `ClassClassifier`        | Parses a class token into one of: `layout`, `conditional`, `gap`, or `utility`                |
| `DependencyEvaluator`    | Decides whether a token survives the active layout mode using configurable regex rules        |
| `defaultDependencyRules` | Built-in rules: strips `flex-*`/`grow`/`shrink`/`basis-*` in grid mode and vice versa         |
| `LayoutState`            | Tracks the active layout mode (`flex`, `grid`, or `none`) for a single pipeline invocation    |
