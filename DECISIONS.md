# Decisions

## Open

### `runtime/*` — deferred

`../pk` has a separate `runtime/*` glob with one package, `@praxis-kit/runtime` (`runtime/core`):
the "Core Runtime" box in the adapter diagram — the validator that adapters call at render time.

Not yet in this workspace. Decide later:

- **Fold into `packages/*`** as `packages/runtime` — if the runtime is a public entry point
  users/adapters import directly.
- **Fold into `lib/*`** as `lib/runtime` — if it is an internal building block behind
  `@praxis-kit/core`.
- **Restore `runtime/*`** as its own glob — if we expect more than one runtime package (e.g. a slim
  runtime vs. a dev/strict runtime).

Until resolved, the runtime code lands in `packages/core`.

### `spikes/*` — deferred

`../pk` keeps a `spikes/*` glob for throwaway experiments (currently empty).

Decide later whether disposable spike packages live in-workspace (fast to wire up, but pnpm installs
and typechecks them) or in a separate scratch location outside the workspace globs.

### `qa/*` tooling ownership — deferred

`jscpd`, `ts-morph` (and `@ast-grep/cli`) sit in the root `devDependencies` today, carried over from
`../pk`. They are QA/analysis infrastructure, not root tooling — no root script invokes them. Next
cleanup pass: move the `devDependency` declarations into the `qa/*` packages that actually use them
(each referencing `catalog:`), leaving only version ownership at the root via the catalog. Same
question applies to `jsdom` and `type-fest` once test/config packages exist that import them (both
already pared back: `jsdom` dropped from root, `type-fest` under review).

## Resolved

### Vitest: root `vitest.config.ts` with `test.projects` (not `vitest.workspace.ts`)

Vitest 4 deprecates the standalone `vitest.workspace.ts` that `../pk` uses. `vitest.config.ts` at
the root declares a `test.projects` glob over
`{lib,packages,adapters,plugins,tooling,qa,examples}/*/vitest.config.ts`; each package owns its own
config. Inert until the first package with tests. `configs/vitest.base.ts` (shared `defineLibConfig`
/ `defineJsdomConfig` helpers) is still deferred — it lands with that package.

### ESLint: ported from `../pk`, minus the in-repo plugin

`eslint.config.ts` + `configs/{base,typescript,architecture,imports,unicorn,types}.ts` are ported.
Two pieces are left out until the packages they need exist:

- the `@praxis-kit` ESLint plugin import and the self-validation block that runs its rules over
  `packages|adapters|examples/*/src` — needs `plugins/eslint`.
- `configs/praxis-plugin.ts` and `configs/vitest.base.ts`.

`configs/architecture.ts`'s `boundaries/elements` patterns are copied verbatim; they match nothing
(and so enforce nothing) until those package dirs land.

### Git workflow: `main` stable, `develop` integration

`main` holds only stable, released state. `develop` is the integration branch — feature branches
start from `develop` and merge back into it; `develop` merges into `main` at a release.
`.vscode/tasks.json` carries the workflow helpers — `Git: sync repository` fetches and hard-resets
**both** `main` and `develop` to their origins then prunes gone branches; `Git: switch develop` and
the individual `Git: reset … to origin` / `Git: prune gone branches` tasks are also exposed. The
file is re-included in `.gitignore` past the global `.vscode` exclusion so the workflow travels with
the repo. A `Git: start feature` task is deferred — the branch name needs input, so it is handled
outside a plain shell task for now.

### Bundler: tsdown (not tsup)

`../pk` catalogs both `tsup` and `tsdown`. This repo standardises on **tsdown** for package builds;
`tsup` is removed from the catalog. Revisit only if a concrete blocker surfaces.

### Release flow: Changesets

`@changesets/cli` is in the foundation commit (catalog + root `devDependencies`, `changeset` /
`version` / `release` scripts). A `.changeset/config.json` and the CI release job land with the
first publishable package.
