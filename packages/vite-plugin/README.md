# @praxis-kit/vite-plugin

Vite plugins for praxis-kit — build-time contract validation, dead compound pruning, variant class
pre-computation, and static composition.

---

## Installation

```bash
pnpm add -D @praxis-kit/vite-plugin
```

---

## Plugins

### `contractPlugin`

Validates `enforcement.children` cardinality constraints at build time for JSX usage sites. Flags
constraint violations as Vite warnings or errors before the bundle is produced.

```ts
import { contractPlugin } from '@praxis-kit/vite-plugin'

export default {
  plugins: [contractPlugin()],
}
```

Static JSX children are validated during `transform`. Cross-file usage sites (component imported
from another module) are validated in `buildEnd` once the full module graph is known. Dynamic
children (mapped arrays, conditional renders) are skipped.

Options:

| Option        | Default                       | Description                       |
| ------------- | ----------------------------- | --------------------------------- |
| `calleeNames` | `['createContractComponent']` | Factory function names to analyze |
| `severity`    | `'warning'`                   | `'warning'` or `'error'`          |

---

### `compoundPrunePlugin`

Removes dead `styling.compounds` entries from factory calls at build time. A compound is dead when
any of its conditions reference a variant key or value that doesn't exist in `styling.variants`.

```ts
import { compoundPrunePlugin, contractPlugin } from '@praxis-kit/vite-plugin'

export default {
  plugins: [compoundPrunePlugin(), contractPlugin()],
}
```

Place before `contractPlugin` so cardinality analysis sees the pruned source.

---

### `classExtractPlugin`

Pre-computes all statically-knowable variant class strings and injects them into the factory call as
`precomputedClasses`. At runtime, `VariantClassResolver` does a plain object lookup instead of
invoking CVA.

```ts
import { compoundPrunePlugin, classExtractPlugin, contractPlugin } from '@praxis-kit/vite-plugin'

export default {
  plugins: [compoundPrunePlugin(), classExtractPlugin(), contractPlugin()],
}
```

Skipped when `styling.variants` is absent, contains non-literal values, `styling.compounds` has
non-literal conditions, or the total combination count exceeds 512.

---

### `slotTransformPlugin`

Rewrites `asChild` JSX usage sites to the render-prop form at build time, eliminating the Slot /
`cloneElement` / `mergeProps` runtime path for static sites.

Only transforms sites with exactly one static child that has no conflicting `className`, `style`, or
event handler props.

```ts
import { slotTransformPlugin, contractPlugin } from '@praxis-kit/vite-plugin'

export default {
  plugins: [slotTransformPlugin(), contractPlugin()],
}
```

---

### `staticCompositionPlugin`

Inlines same-file static component usage sites into direct element creation, bypassing the runtime
pipeline entirely.

Requires `classExtractPlugin` to run first so `precomputedClasses` is present. A usage site is
inlined only when no `as`, `asChild`, `render`, or spread attributes are present and all variant
props are static string literals.

```ts
import { classExtractPlugin, staticCompositionPlugin } from '@praxis-kit/vite-plugin'

export default {
  plugins: [classExtractPlugin(), staticCompositionPlugin()],
}
```

---

### `ssrOptimizePlugin`

Convenience bundle that applies `slotTransformPlugin`, `classExtractPlugin`, and
`staticCompositionPlugin` in the correct order. Especially effective for SSR builds where each
component renders once per request.

```ts
import { ssrOptimizePlugin, contractPlugin } from '@praxis-kit/vite-plugin'

export default {
  plugins: [...ssrOptimizePlugin(), contractPlugin()],
}
```

---

### `designTokensPlugin`

Extracts design token usage from factory calls and emits a typed manifest. See exported types
`DesignTokenManifest` and `DesignTokensOptions` for configuration.

---

## Recommended plugin order

```ts
plugins: [
  compoundPrunePlugin(), // prune dead compounds first
  classExtractPlugin(), // inject precomputedClasses
  slotTransformPlugin(), // rewrite asChild sites
  staticCompositionPlugin(), // inline static usage sites
  contractPlugin(), // validate cardinality on the transformed source
]
```
