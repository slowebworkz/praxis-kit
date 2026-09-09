# The release gate — `pnpm verify:release`

One command decides whether the repository is in a releasable state. If it passes, the published
`praxis-kit` artifact builds, type-checks, tests, packs, installs into a clean consumer, exposes
every public entry, tree-shakes, stays within its bundle-size budget, and its architecture /
public-API / complexity metrics have not regressed against the committed baseline.

```sh
pnpm verify:release
```

CI runs it on every push and PR to `main` / `develop` (`.github/workflows/ci.yml`).

## What it runs, in order

| Step | Command                                             | Checks                                                                                                                                                                                                                                                                                                                                 |
| ---- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `pnpm verify`                                       | Builds `packages/kit`, then `pnpm check` (`lint:check` → `typecheck` → `test`, all 29 packages) and `pnpm repo-state` (regenerates `.repo-state/`, fails on drift).                                                                                                                                                                    |
| 2    | `pnpm --filter ./packages/kit lint:pkg`             | `publint` — export-map correctness, resolution under node10 / node16 / bundler.                                                                                                                                                                                                                                                        |
| 3    | `pnpm --filter ./packages/kit test:pack`            | `scripts/smoke-test.ts`: build → `pnpm pack` → install the tarball into an isolated fixture **outside** this workspace (no pnpm hoisting) → `import()` every public JS entry → resolve every typed entry's `.d.ts` with `tsc` → compile `Polymorphic.svelte` (client + server) and resolve its imports → run the `praxis-codemod` bin. |
| 4    | `pnpm --filter @praxis-kit/tree-shaking-tests test` | Per-scenario live-module-count assertions + gzip regression (`snapshots/gzip.json`).                                                                                                                                                                                                                                                   |
| 5    | `pnpm --filter @praxis-kit/bundle-analysis test`    | Inventory check, dead-code / workspace-import leak detection, gzip regression.                                                                                                                                                                                                                                                         |
| 6    | `pnpm metrics:collect` → `pnpm metrics:assert`      | `qa/metrics`: architecture-violation hard gate; public-API and complexity growth warn against `qa/metrics/snapshots/metrics.json` (git-committed baseline). Depends on step 1's `.repo-state/` and step 4's `gzip.json`.                                                                                                               |

Steps 3–5 each rebuild what they need, so the gate is safe to run from any state.

## Ordering constraints (why the sequence matters)

- `packages/kit/dist/` must exist before `pnpm -r typecheck` — `qa/tree-shaking-tests`'
  `scenarios/package/*` resolve `praxis-kit/<entry>` types through it. `pnpm verify` builds
  `packages/kit` first; `pnpm build` was also reordered (`pnpm -r build && pnpm typecheck`) so it is
  self-sufficient on a fresh checkout.
- `pnpm metrics:collect` reads `.repo-state/{dependency-graph,exports}.json` (from
  `pnpm repo-state`, run in step 1) and `qa/tree-shaking-tests/snapshots/gzip.json` (written in step
  4).

## Updating baselines

Deliberate, reviewed changes will move the numbers the soft gates track:

```sh
pnpm --filter @praxis-kit/tree-shaking-tests gzip:update   # dist gzip sizes
pnpm --filter @praxis-kit/bundle-analysis gzip:update       # dist gzip sizes
pnpm metrics:collect && cp qa/metrics/snapshots/metrics.json … # commit the new snapshot
```

Commit the updated snapshot files in the same change that moves them, with a note on why.

## Not covered here

- **Per-framework real consumer apps** — `test:pack` import-checks one fixture with all peers; it
  does not scaffold + build + render a real app per framework (React/Vue/Solid/Svelte/Preact/Lit/
  Web). Tracked separately.
- **Publish mechanics** — changesets, npm auth, provenance, the `private: true` / version flip.
  `.github/workflows/publish.yml` owns those.
