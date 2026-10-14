---
"praxis-kit": minor
---

`ContractProps<T>` (React — current and legacy — Preact, and Vue) now reflects what a component
actually forwards when it declares `compose: { with, allProps: true }`. A composing component's
extracted props previously only ever included its own contract — `with`'s forwarded
props/variants were reachable at runtime but invisible to the type system, so a type-safe
consumer had no way to pass them without `as any`.

This is purely additive: a non-composing component's `ContractProps<T>` is unchanged, and a
composing component's own callable signature (`React.ComponentProps<typeof Component>` or
equivalent) is also unchanged — only `ContractProps<T>`'s extracted type, across every render
mode each adapter supports, grows to include the composed partner's surface. Resolves
transitively through nested composition (a component composing a component that itself
composes another). A same-named prop with incompatible types on both sides surfaces as a
descriptive type error at that key rather than silently resolving to whichever side happened to
be checked first.

Svelte is not included — its extraction mechanism retains only the already-projected generics,
never the full contract `compose` lives on, so there is no type-only path to the same fix there.
Solid and Lit/Web are not yet assessed.
