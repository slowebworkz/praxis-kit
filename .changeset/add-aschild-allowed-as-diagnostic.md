---
"praxis-kit": minor
---

Add `enforcement.nativeTagBehavior` — an opt-in flag for components whose behavior (not just
styling) depends on the resolved tag being one of `allowedAs`, e.g. a `popoverTarget` invoker that
only functions on button-like elements. When set alongside `allowedAs`, `asChild` now warns if the
consumer's child resolves to a tag outside `allowedAs`, in the React, Preact, and Vue adapters,
catching compositions that would silently lose native tag-dependent behavior.
