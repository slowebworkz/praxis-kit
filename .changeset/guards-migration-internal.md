---
---

Relocate all guard functions into a new internal `@praxis-kit/guards` package, sourcing
foundational guards from `guardz` instead of hand-rolled implementations. Public `praxis-kit`
API surface and the published package's bundle size are unchanged — see `DECISIONS.md` ("Guards
migration to `guardz`") for the `source/*` tree-shaking tradeoff this accepted internally.
