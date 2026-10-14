---
"praxis-kit": minor
---

`ContractProps<T, Mode>` (React adapter, current and legacy) now reflects what a component
actually forwards when it declares `compose: { with, allProps: true }`. A composing component's
extracted props previously only ever included its own contract — `with`'s forwarded
props/variants were reachable at runtime but invisible to the type system, so a type-safe
consumer had no way to pass them without `as any`.

This is purely additive: a non-composing component's `ContractProps<T>` is unchanged, and a
composing component's own `React.ComponentProps<typeof Component>` (its callable signature) is
also unchanged — only `ContractProps<T>`'s extracted type, across every render mode
(`normal`/`asChild`/`render`), grows to include the composed partner's surface. Resolves
transitively through nested composition (a component composing a component that itself
composes another). A same-named prop with incompatible types on both sides surfaces as a
descriptive type error at that key rather than silently resolving to whichever side happened to
be checked first.
