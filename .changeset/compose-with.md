---
"praxis-kit": minor
---

Add `compose: { with: Component }` to `FactoryOptions` — declares that a component always renders
composed `asChild` into another praxis-kit component, as if the consumer had hand-written `<With
asChild><ThisComponent {...props} /></With>`. All consumer props land on the composing component's
own contract exactly as today; `with` always renders bare. Supported on React, Preact, Vue, Solid,
and Svelte, each synthesized natively for that adapter's own composition model (clone-based on
React/Preact/Vue, render-callback/snippet-based on Solid/Svelte). Has no effect on Lit/Web, which
have no `asChild` concept. An explicit `asChild`/`render` from the consumer always wins over
`compose`.
