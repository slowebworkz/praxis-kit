# @praxis-kit/pipeline-kit

Generic, framework-agnostic building blocks for composing function pipelines: a shared
`Pipeline<TArgs, TOutput>` shape, ways to chain/combine pipelines, and one optional memoizing
construction pattern (`definePipeline`) for building a pipeline from resolved config. No
praxis-specific knowledge lives here — concrete pipelines across the codebase are meant to be built
on top of these primitives.

Private workspace, bundled into whichever `praxis-kit` entries need it.

---

## Exports

| Export                                                                                | Purpose                                                                            |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `core` — `Pipeline`, `PipelineStage`, `PipelineTuple`, `AnyFunction`, `UnaryFunction` | Shared type shapes for callable pipelines                                          |
| `core` — `composePipelines`                                                           | Chains two pipelines: one's output feeds the next's single argument                |
| `core` — `allPipelines`                                                               | Applies a tuple of pipelines to the same args, returns their results as a tuple    |
| `core` — `anyPipeline`                                                                | Applies pipelines in order, returns the first defined result                       |
| `factory` — `definePipeline`                                                          | Wraps a factory function, memoizing the built pipeline by resolved-config identity |

Not to be confused with `@praxis-kit/pipeline`, which is the multi-pass processor/pass-context
engine underneath the diagnostics engine and the vite-plugin compiler passes. `pipeline-kit` is
lower-level: plain function composition and combination, with no notion of passes or
short-circuiting.

Development: `pnpm --filter @praxis-kit/pipeline-kit test`, `typecheck`, `lint`.
