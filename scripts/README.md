# scripts/

Repo-level tooling that isn't scoped to any single workspace. Not a pnpm workspace itself — these
run against the whole monorepo from the root `package.json`.

| File                     | Invoked via             | Purpose                                                                                                                                                                                                                                      |
| ------------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-repo-state.ts` | `pnpm repo-state`       | Generates architecture manifests into `.repo-state/` (package graph, export surfaces, key contract shapes, dependency graph + cycle/violation detection, documented runtime phase order, adapter inventory, deterministic architecture hash) |
| `ast-grep.sh`            | `pnpm analyze:patterns` | Invokes the native `ast-grep` binary directly, bypassing a pnpm shim that runs it through Node instead of as an executable                                                                                                                   |
| `tsconfig.json`          | —                       | TypeScript config for typechecking this folder's `.ts` scripts                                                                                                                                                                               |

`generate-repo-state.ts` uses `ts-morph` and `dependency-cruiser` to inspect `packages/*` source
directly; it exits non-zero if `dependency-cruiser` reports architectural violations, so it doubles
as an architecture lint gate.
