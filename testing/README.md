# testing

Reusable testing infrastructure for praxis-kit: shared suites, helpers and (later) fixtures that
many packages run, kept out of the production packages they exercise.

## Layout

| Path           | Workspace package?   | Purpose                                                         |
| -------------- | -------------------- | --------------------------------------------------------------- |
| `packages/*`   | yes                  | Importable testing packages (`@praxis-kit/*-testing`).          |
| `integration/` | no (not created yet) | Repo-level integration suites, with their own Vitest config.    |
| `e2e/`         | no (not created yet) | Repo-level end-to-end suites, with their own Playwright config. |

Only `testing/packages/*` is a pnpm workspace glob. `integration/` and `e2e/` are suites, not
packages: they are created when something lands there and are run through their own config.

## Packages

- [`adapter-testing`](packages/adapter-testing) — the cross-framework adapter suites (conformance,
  a11y, SSR, hydration, performance, isolation, compound component, `onElement`) and the
  `ConformanceAdapter` contract each adapter implements.
- [`tailwind-testing`](packages/tailwind-testing) — the cross-adapter Tailwind parity suites
  (display, compose plugin, asChild plugin, polymorphic element).
- [`test-utils`](packages/test-utils) — the few Vitest helpers (`expectContains`, `withWarnSpy`)
  that more than one testing package needs; no praxis-kit dependencies.
- [`playwright-testing`](packages/playwright-testing) — Playwright component-test helpers: ARIA
  snapshot assertions, keyboard sequences, axe sweeps and console/diagnostic catchers. Used by the
  React and Vue CT specs.

## Rules

1. **Production packages never depend on testing packages.** Adapters and libraries may list them
   under `devDependencies` only; `packages/kit` (the published package) may not reference them at
   all. `pnpm check:testing-boundary` enforces this and runs as part of `pnpm check`.
2. Testing packages may depend on production packages (`core`, `diagnostics`, `primitive`, …).
3. Tests stay next to the implementation they protect. Only suites that _every adapter_ runs belong
   here.
4. Shared infrastructure adds no framework dependency: a testing package must not depend on React,
   Vue, Solid, Svelte or Lit. Adapters supply the framework glue through the adapter contract.
5. No package for organisational symmetry. A new `testing/packages/*` package needs an independent
   responsibility and real reuse.

## Adding a package

1. Create `testing/packages/<name>/` with `package.json` (private, `0.0.0`,
   `exports: { ".": "./src/index.ts" }`, `vitest` as a peer dependency), `tsconfig.json`
   (`extends ../../../tsconfig.base.json`) and `src/index.ts`.
2. Add it to `tsconfig.paths.json`, the root `tsconfig.json` references, `configs/architecture.ts`
   and the `ignore` list in `.changeset/config.json`.
3. Add it as a `devDependency` of the packages that run it, then `pnpm install`.
4. Run `pnpm check:testing-boundary` and `pnpm typecheck`.
