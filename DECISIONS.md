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

### Versioning: `0.x` until usable, then `v1.0.0`

Every package stays on `0.y.z` until `@praxis-kit/kit` can be installed and used to build a real
component with contract enforcement working through at least one framework adapter and the
standalone runtime. That milestone is `v1.0.0` — the first git tag, cut on `main`.

- Pre-1.0, breaking changes are expected and do not force a major; Changesets moves `0.y.z`.
- The old repo's version numbers are **not** carried over (`../pk` had drifted to root `4.0.0` and
  `@praxis-kit/kit` `7.8.1` with no changeset config). This repo starts at `0.0.0` and Changesets
  owns every bump from the first publishable package.
- No `v0.x` tags unless a real pre-release is cut; no version badge in `README.md` before `v1.0.0`.

Migration status and the full "where version numbers live" checklist are tracked in
`.vscode/MIGRATION.md` (uncommitted).

### `lib/pipeline` — execution strategy is per-pipeline; parallel conflicts throw

`Pipeline.strategy` is `'sequential'` (default when omitted) or `'parallel'`, set on each pipeline
so a tree can mix them. `runPipeline` reduces every node — `Pass` or nested `Pipeline` — to the
same `{ patch, diagnostics, metadata }` outcome, then folds those outcomes per strategy:

- **sequential** — a barrier between nodes; each node sees the previous node's merged context.
- **parallel** — every node runs against the same input (`Promise.all`); patches are checked with
  `detectConflicts` and merged. Diagnostics and metadata still accumulate in node order so the
  result is deterministic.

**A parallel key conflict throws `ParallelConflictError`, it is not a diagnostic.** Two concurrent
nodes writing the same key with no ordering between them is a pipeline *authoring* bug — there is
no correct merged value to pick. Diagnostics are for invalid *input*, not invalid pipelines. Fail
fast, name the pipeline and the keys.

A nested pipeline running as a parallel node contributes `shallowDiff(input, itsResult)` — it saw
the same input a sibling pass saw, and `mergeContext` keeps untouched keys by reference, so the
diff is exact for untouched keys and conservative (flags a change) for a key reassigned to an
equal-but-new value.

Still deliberately **not** built: a synchronous fast path for all-sync pipelines, and any
`concurrency` limit on `parallel` (all nodes fire at once).

### `lib/pipeline` — phases are composition sugar, not an execution mode

`phasedPipeline(name, phases)` builds a plain `Pipeline` whose top-level nodes are the canonical
phases — `normalize`, `enrich`, `validate`, `emit` (`PIPELINE_PHASES`, always that order) — as
nested sub-pipelines, one per non-empty phase. It runs through `runPipeline` with zero special
casing.

- **No new runtime.** A phase is a nested `Pipeline` named after the phase; the executor already
  handles nesting. The only thing `phasedPipeline` adds is the fixed order and the phase names.
- **Empty phases are dropped**, not run as empty sub-pipelines, so the tree reflects the work that
  exists.
- **The names carry no semantics here.** `validate` is not wired to fail-on-diagnostic; `emit` is
  not special. The pipeline package assigns meaning only to *order*. Consumers (the compiler, the
  runtime) attach the behaviour.
- Naming each phase sub-pipeline means a `RunResult`'s diagnostics and any tree-walking tooling can
  attribute work to a phase without a separate phase concept in the executor.

### `lib/pipeline` — sequential executor is `runPipeline`, always async, returning `RunResult`

`runPipeline(pipeline, input)` walks `pipeline.nodes` in order with a barrier between each: a leaf
`Pass` is `execute`d and its patch folded in via `mergeContext`; a nested `Pipeline` runs in place
and its whole outcome is folded into the parent's accumulation.

- **`RunResult` is not `PassResult`.** `PassResult` is a *patch* one pass proposes
  (`context?: Partial<TContext>`); `RunResult` is the fully accumulated state the executor owns —
  final `context: TContext`, and the concrete `diagnostics` / `metadata` collected across the run.
  A pass never sees a `RunResult`. This is the "execution result vs accumulated context" boundary.
- **Always returns a `Promise`.** A node may be an async pass (`MaybePromise`), so the executor
  awaits every node. A synchronous fast path for all-sync runtime pipelines is a later performance
  concern — not built until benchmarks justify it.
- **Diagnostics concatenate** in run order. **Metadata shallow-merges** in run order (last key
  wins); passes that must not collide namespace their keys. Metadata is never merged into
  `context`.
- Nesting is structural: a node is a `Pipeline` when it has `nodes`, else a `Pass`. No base class,
  no `kind` tag.

### `lib/pipeline` — context merge is shallow top-level replace

`mergeContext(accumulated, patch)` is `{ ...accumulated, ...patch }`: each key present on a
`PassResult.context` patch replaces that key's value wholesale; absent keys are untouched. No deep
or per-domain merge.

Why:

- It is the honest match for `PassResult.context`'s `Partial<TContext>` type — a shallow patch,
  merged shallowly. Deep merge would make the type and the runtime disagree.
- Order-independent under one stateable rule: two passes in the same parallel group must not write
  the same key. `detectConflicts` enforces that for the future parallel executor. Deep merge has no
  such rule — write order silently changes the result.
- `diagnostics` and `metadata` live outside `context` and accumulate separately, which absorbs most
  of the "different domains need different merge semantics" pressure.
- Smallest thing that unblocks `Pipeline`. When a concrete in-`context` domain needs concat or
  recursive merge, a strategy map can be added with shallow replace as the default — backward
  compatible.

Invariant carried forward: a `Pass` never owns the pipeline's context. It produces a patch; the
executor owns accumulation. `Pass` → `PassResult` → { context patch → `mergeContext` → accumulated
context; diagnostics → accumulation; metadata → tooling, never merged into context }.

### Vitest: root `vitest.config.ts` with `test.projects` (not `vitest.workspace.ts`)

Vitest 4 deprecates the standalone `vitest.workspace.ts` that `../pk` uses. `vitest.config.ts` at
the root declares a `test.projects` glob over
`{lib,packages,adapters,plugins,tooling,qa,examples}/*/vitest.config.ts`; each package owns its own
config. `configs/vitest.base.ts` (shared `defineLibConfig(name, overrides?)`) is ported too, as of
the first package (`lib/pipeline`) — collapsed to one function with `environment` etc. passed
through `overrides` rather than `../pk`'s separate `defineJsdomConfig`; `include` is enforced last
as policy.

### ESLint: ported from `../pk`, minus the in-repo plugin

`eslint.config.ts` + `configs/{base,typescript,architecture,imports,unicorn,types}.ts` are ported.
Two pieces are left out until the packages they need exist:

- the `@praxis-kit` ESLint plugin import and the self-validation block that runs its rules over
  `packages|adapters|examples/*/src` — needs `plugins/eslint`.
- `configs/praxis-plugin.ts`.

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
