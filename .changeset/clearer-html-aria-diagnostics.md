---
'praxis-kit': patch
---

Diagnostics are less noisy and clearer:

- `<nav role="region">` and other `role="region"` overrides on a native landmark report once
  (`HTML3004`) instead of also firing `HTML3006`, `HTML3008` and `ARIA2009`.
- A plain `<nav>` or `<aside>` no longer gets `ARIA2009` ("no accessible name"). The
  `html.landmark.accessible-name` rule is no longer built in; `landmarkAccessibleNameRule` is still
  exported for pages that want to enforce names on repeated landmarks.
- Invalid-child messages name the offending element (`<a>`, `<div>`) instead of `"object"`, and HTML
  parents list what they allow.
- A component created without a name appears as `Anonymous component` in diagnostics instead of
  `PolymorphicComponent`.
