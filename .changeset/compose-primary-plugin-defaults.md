---
'praxis-kit': patch
---

Preserve the primary component's resolved defaults and `normalize` output for plugin-owned selector
props when composing with `compose.with`, and keep mutually exclusive display modes (`flex`, `grid`,
…) from the highest-precedence source so lower-precedence defaults can't add a conflicting mode.
