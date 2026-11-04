---
'praxis-kit': minor
---

`diagnostics: 'warn'` is now report-only: it no longer strips `role` or `aria-*` props it has just
warned about, so the props you wrote reach the DOM unchanged. `'throw'` and `'silent'` behave as
before. A `role` value that is not a known ARIA role (for example `role="bogus"`) now raises
`ARIA2008`, and throws under `diagnostics: 'throw'`.
