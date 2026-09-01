# @praxis-kit/pipeline

Generic multi-pass pipeline primitives — reusable execution machinery for Praxis's compiler and
runtime processing. No praxis-specific knowledge lives here, and the package names no particular
consumer: diagnostics, `plugins/vite`, and the runtime are potential users, not a fixed dependency
model.

Private workspace package, bundled into whichever `praxis-kit` entries need it.

---

## Status

Built in phases (see `DECISIONS.md` and the Phase 1 plan):

1. **Pass** — the fundamental executable unit: `execute(context) -> PassResult`, sync or async. ←
   _here_
2. Context merge semantics — what a `PassResult.context` patch means when applied to the
   accumulated context (code + tests, not a design doc). Must land before Pipeline. See
   `DECISIONS.md`.
3. Pipeline — recursive `Pass | Pipeline` nodes, sequential execution.
4. Named pipelines — `normalize` / `enrich` / `validate` / `emit` phases.
5. Execution strategies — `sequential` (barriers) vs `parallel` (merge after completion); parallel
   depends on the merge model being order-independent.

Plugin injection (third-party pass contribution) is deferred to its own commit — see `DECISIONS.md`.

## Exports

| Export                                            | Purpose                                  |
| ------------------------------------------------- | ---------------------------------------- |
| `Pass`                                            | The executable unit — `name` + `execute` |
| `PassResult`                                      | `{ context?, diagnostics?, metadata? }`  |
| `Diagnostic`                                      | A single problem a pass reports          |
| `MaybePromise`, `MetadataMap`, `PipelineStrategy` | Shared primitives                        |

Development: `pnpm --filter @praxis-kit/pipeline test`,
`pnpm --filter @praxis-kit/pipeline typecheck`.
