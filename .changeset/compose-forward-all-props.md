---
"praxis-kit": minor
---

`compose: { with }` now accepts an opt-in `allProps?: boolean` flag. When set, the composing
component's own raw props are forwarded onto `with` (alongside the `asChild`/`ref`/`children` it
already receives), letting `with`'s own contract resolve its variants/`compounds` against them —
the same prop surface a hand-written `<With {...props} asChild><ThisComponent {...props}
/></With>` would give it. Defaults to `false`, so existing `compose.with` consumers keep today's
exact behavior (`with` renders with its own fixed defaults) with no change required. Supported on
every adapter `compose` already works on: React (current and legacy), Preact, Vue, and Solid/
Svelte's synthesized composition model.
