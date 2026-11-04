# @praxis-kit/tailwind-testing

The cross-adapter Tailwind parity suites: display shorthands and layout resolution, composition
plugin selection, explicit `asChild` plugin ownership, and polymorphic `as` host resolution.

Deliberately independent of `@praxis-kit/tailwind` — an adapter builds the component with
`createTailwindPipeline` and the suite only asserts on the resulting classes and diagnostics.

Private and source-exporting; consumed as a `devDependency` by `adapters/*`. Requires `vitest` as a
peer dependency. See [`../../README.md`](../../README.md) for the workspace rules.
