---
'praxis-kit-diagnostics': minor
---

A versioned contract for language packs, and the tooling to validate them.

- **Contract.** `praxis-kit-diagnostics/contract` (and `/contract.json`) describes every
  catalog-driven id: its context keys and their kinds, which are essential, plural selectors, spec
  links and real examples. Catalogs declare the contract major they target (`"contract": 1`). Packs
  are validated against it, not against the English catalog.
- **`praxis-kit-diagnostics validate`.** A command (and `checkCatalog` in code) that reports
  structural errors apart from completeness, with obsolete and deprecated ids, plural and
  placeholder checks, and `--min-coverage`, `--fail-on-obsolete`, `--json`, `--contract`,
  `--extension`. Exit codes: 0 valid, 1 errors, 2 below coverage, 64 bad usage.
- **`praxis-kit-diagnostics export-source`.** A translator sheet (JSON or Markdown) per id.
- **Custom-rule ids.** Declared in an extension contract and validated like built-in ids.
- **Resolver fallback.** `createMessageResolver(pack, { fallback, onIssue })`: pack, then fallback
  catalog(s), then the printed code. English stays opt-in. A pack for another contract major is
  ignored and reported through `onIssue`; the resolver never throws.
- **Schema.** `schema.json` / `catalog.v1.schema.json` are generated from the contract.
- `MessageCatalog` now requires `contract`. `validateCatalog(catalog, reference)` still works but is
  deprecated in favour of `checkCatalog(catalog, contract)`.
- Not every diagnostic is catalog-driven yet; the rest print as their code. See
  `docs/localization/authoring-language-packs.md`.
