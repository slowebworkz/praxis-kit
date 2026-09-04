# @praxis-kit/vite-plugin

The build-time half of praxis-kit's tooling: a small static **compiler** for components created with
`createContractComponent`, exposed as Vite plugins.

- **Validation** — `contractPlugin` checks `enforcement.children` cardinality + ARIA overrides.
- **Optimisation** — `compoundPrunePlugin`, `classExtractPlugin`, `slotTransformPlugin`, and
  `staticCompositionPlugin` strip runtime work the compiler can resolve statically.
- **`ssrOptimizePlugin`** bundles the three transforms. **This is the headline use case**: in an SSR
  build each component renders once per request, so eliminating the per-render contract / variant /
  pipeline work compounds. On a purely client-rendered app the win is smaller.

> **Scope.** Everything here is **best-effort static analysis**, not whole-program verification. It
> reads syntax with the TypeScript parser — simple named imports and aliases resolve, but
> `import * as X`, deep barrel re-exports, and dynamically-built config are left alone. Anything the
> compiler can't prove is left untouched for the runtime to handle. `contractPlugin` is a safety net
> on top of the runtime + ESLint checks, not a replacement.

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

> **Experimental.** This transform erases the most runtime semantics (refs, context, default props,
> dev-mode behaviour, RSC boundaries all pass through the runtime today). It bails out aggressively,
> but treat it as opt-in until it has differential tests proving output equivalence against the
> runtime path.

Inlines same-file static component usage sites into direct element creation, bypassing the runtime
pipeline entirely.

Requires `classExtractPlugin` to run first so `precomputedClasses` is present. A usage site is
inlined only when no `as`, `asChild`, `render`, or spread attributes are present, all variant props
are static string literals, `className` is absent or a static literal, and the factory config has no
`defaults` or `enforcement`.

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

> Not yet available in this build — deferred with `@praxis-kit/tailwind`. See the migration notes.

Extracts design token usage from factory calls and emits a typed manifest.

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
