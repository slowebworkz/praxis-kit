---
'praxis-kit': patch
---

A composing component's call signature now accepts the `compose.with` partner's declared styling
variants inline (for example `<Card shadow />`), matching `ContractProps`. Previously such a variant
could be defaulted through `compose.defaults` but not overridden in JSX. Applies to React, Preact,
Solid and Vue; the partner's ordinary and plugin props are unchanged.
