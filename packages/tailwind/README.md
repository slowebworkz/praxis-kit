# @praxis-kit/tailwind

Tailwind CSS integration for praxis-kit — layout-aware class pipeline with variant composition.

Wraps the core class pipeline with a Tailwind-specific resolver that understands layout props (`p`,
`m`, `w`, `h`, etc.) and generates the correct utility classes based on variant context and tag.

---

## Installation

```bash
pnpm add @praxis-kit/tailwind
```

---

## Usage

Pass `createTailwindPipeline` as the `styling.plugin` in any framework adapter factory:

```ts
import { createContractComponent } from '@praxis-kit/react'
import { createTailwindPipeline } from '@praxis-kit/tailwind'

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
```

With the plugin active, layout props are stripped before the element renders and converted to
Tailwind classes automatically:

```tsx
// p, m, w, h, etc. become utility classes — not DOM attributes
<Button p={4} w="full">
  Click me
</Button>
```

---

## Exports

| Export                   | Description                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| `createTailwindPipeline` | Plugin factory — pass as `styling.plugin`                                |
| `ClassBuilder`           | Builds the final class string from static + variant + layout sources     |
| `ClassClassifier`        | Classifies an incoming class string into static vs. layout-owned buckets |
| `DependencyEvaluator`    | Evaluates layout prop dependencies and resolves conflicts                |
| `defaultDependencyRules` | Default ruleset governing layout prop relationships                      |
| `LayoutState`            | Accumulates layout props during a render and emits their class string    |
