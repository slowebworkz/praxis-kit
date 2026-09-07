# @praxis-kit/metrics

Metrics collection, snapshotting, and reporting for the monorepo — the numeric memory of the QA
layer. Aggregates bundle sizes (`qa/tree-shaking-tests`), architecture health
(`.repo-state/dependency-graph.json` + `exports.json`, from the root `pnpm repo-state`), and source
complexity (`lib/*` + `packages/core`) into a snapshot so trends are visible across commits.

```bash
pnpm repo-state                              # prerequisite — writes .repo-state/*
pnpm --filter @praxis-kit/metrics metrics    # collect + report
pnpm --filter @praxis-kit/metrics assert     # CI gate
```

Architecture violations are a hard gate (non-zero exit); public-API and complexity growth against
the committed baseline are warn-only.

Ported from `../pk`'s `qa/metrics` plus its prerequisite `scripts/generate-repo-state.ts` (not
previously ported here — see `DECISIONS.md`). Two real bugs found in `../pk` itself during the port,
fixed rather than carried forward: `generate-repo-state.ts`'s package discovery only ever globbed
`packages/`, silently producing an empty `adapters.json`/`contracts.json` and a near-empty
`exports.json` even in `../pk`'s own current layout; `assert.ts`'s git-baseline path pointed at
`lib/metrics/...`, a location that never existed in either repo, silently no-op'ing every soft-gate
comparison. The dependency-graph data source also changed: `../pk` shells out to
`dependency-cruiser` against a config this repo never configured; here it's derived from
`eslint-plugin-boundaries` (`configs/architecture.ts`), the mechanism this repo already CI-gates
architecture with. See `DECISIONS.md`.
