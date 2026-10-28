---
'praxis-kit': patch
---

Treat the Tailwind important modifier consistently in `praxis-kit/tailwind`: `!flex-col` and
`md:!grid-cols-2` are now filtered under a conflicting layout mode exactly like `flex-col!`, instead
of leaking through. Important display utilities (`!flex`, `flex!`, `md:!flex`) are unchanged and
still bypass the reserved-display filter.
