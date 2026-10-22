---
'praxis-kit': patch
---

Fix `compose.allProps` forwarding so the composing component's consumed `as` prop is not passed to its composed partner, preserving single-element polymorphic rendering across React, Preact, Vue, and Solid. Add shared adapter conformance coverage for the regression; Svelte already consumes `as` before forwarding its remaining props.
