# qa/

Quality gates that don't belong to any single workspace: performance, bundle composition, and
regression tracking across the published surface. All private; none ship to npm.

| Workspace             | Purpose                                                                                |
| --------------------- | -------------------------------------------------------------------------------------- |
| `bench/`              | Benchmark suites for all capability layers (e.g. praxis-kit Tabs vs hand-rolled React) |
| `bundle-analysis/`    | Bundle composition analysis for the published entry points                             |
| `tree-shaking-tests/` | CI-gated tree-shaking assertions and gzip regression tracking                          |
| `metrics/`            | Metrics collection, snapshotting, and reporting for the monorepo                       |

These workspaces consume the _built_ output where relevant — changes to `packages/kit`'s build
configuration (entry points, shared chunks, externals) should be validated here, not just by
typecheck.
