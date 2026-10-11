---
"praxis-kit": minor
---

Add `PolymorphicWithAllowedAs<G>` to the React, Preact, Solid, and Vue adapters — a
`PolymorphicProps<G, TAs>` variant with `as` widened to every tag in `AllowedOf<G>` instead of
defaulting to a single tag, for consumers building wrapper/forwarding prop types.
