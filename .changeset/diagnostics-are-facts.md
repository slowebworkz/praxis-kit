---
'praxis-kit': major
---

Diagnostics are now facts, and message text is optional.

A diagnostic is a `code`, a severity, a category and a `context`; Praxis Kit no longer carries
English prose. A bare install prints the code, for example `Warning HTML3004` where it used to print
`Warning HTML3004: [HTML] <nav> should not override its implicit role="navigation" with role="region".`

- `Diagnostic.message` is now `message?: string`. Code that reads it needs to handle `undefined`
  (`diagnostic.message ?? diagnostic.code`). `PraxisError.message` is the code when there is no
  text.
- To get text, install the new, independently published package `praxis-kit-diagnostics` (optional;
  it has no dependency on `praxis-kit`) and give a `Diagnostics` instance a resolver:

  ```ts
  import { createDiagnostics } from 'praxis-kit/contract'
  import { createMessageResolver } from 'praxis-kit-diagnostics'
  import en from 'praxis-kit-diagnostics/en'

  const diagnostics = createDiagnostics('warn', { messages: createMessageResolver(en) })
  ```

  The resolver belongs to that instance, so different instances can report in different languages at
  once. English is its own entry and is left out of a bundle that imports another locale.

- New exports from `praxis-kit/contract`: `createDiagnostics`, `MessageResolver`, `DiagnosticText`,
  `DiagnosticsMode`.
- The async console reporter now de-duplicates on the printed line **and** the diagnostic's context,
  so two different problems with the same code are no longer collapsed into one line.
- Smaller bundles: `guardz` is no longer part of the published code. It cannot be tree-shaken, so
  one guard used to pull in the whole library; the few guards Praxis Kit uses are now written out in
  `@praxis-kit/foundation`, with the same behaviour, and English no longer ships by default.
  `praxis-kit/contract` grows by about 1 KB for `createDiagnostics`.
- `ValidationViolation.message` and `ChildViolation.message` hold the diagnostic's code when no text
  is available.

HTML, ARIA, contract (children, variants, `as`), slot and accessibility-advisory diagnostics are
covered. Diagnostics from the Tailwind pipeline, the Vite and ESLint plugins, plugin-API checks and
a few core checks still carry their own English text and will move to the catalog in follow-up
changes.
