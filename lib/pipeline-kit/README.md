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

---

## The layer model

Drawn bottom-up, like an OSI/TCP-IP stack: each layer only depends on the one directly beneath it,
is usable without anything above it, and has no knowledge that higher layers exist at all.
Dependencies only ever point downward — a layer is defined by what it doesn't need to know about,
not just what it provides.

| Layer  | Name                                     | Depends on | Contents                                                                                                              |
| ------ | ---------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| **L1** | Core pipeline structure (the foundation) | nothing    | `Pipeline<TArgs, TOutput>`, `PipelineStage<TInput, TOutput>`, `composePipelines()`, `allPipelines()`, `anyPipeline()` |
| **L2** | Resolved-config construction             | L1         | `ResolvedConfig`, `PipelineFactory<TResolved, TArgs, TOutput>`, `definePipeline()`                                    |
| **L3** | Concrete pipelines                       | L2         | `createClassPipeline` (`lib/styling`), `createResolverPipeline`, `createTagPipeline`                                  |
| **L4** | Adapters — consumers                     | L3         | each framework adapter's `create-contract-component.ts`                                                               |

- **L1** is fully agnostic: just "args in, output out," and three ways to combine pipelines that are
  already built. It doesn't know what a resolved options object is, doesn't know a factory pattern
  exists, doesn't know any adapter exists. It's recursive by construction — every combinator's
  output is itself a plain `Pipeline`, so it composes with anything else at this layer without a
  special case. Enforced in code, not just in this doc: `.dependency-cruiser.cjs`'s
  `pipeline-kit-core-no-factory` rule blocks `core` from importing `factory`.
- **L2** is one optional, named pattern for building a `Pipeline` from an already-resolved options
  object — the style every existing L3 factory happens to use. It is not required: a composed or
  hand-written pipeline never has to touch this layer at all.
- **L3** factories each know their own resolved-options shape and their own per-call arguments — L2
  and L1 know nothing about any of them.
- **L4** adapters call a concrete L3 pipeline to build an actual component. They know nothing about
  how a pipeline is constructed underneath — only that calling it with resolved options returns
  something callable per render.

**Current status:** `createClassPipeline` (`lib/styling`) is the one production L3 pipeline. A
second — `packages/core/src/factory/create-polymorphic2.ts`'s `createTagPipeline`/
`createPropsPipeline`/`createAriaPipeline` — exists as a verified proof-of-concept (behaviorally
equivalent to `create-polymorphic-full.ts`'s hand-assembled runtime, same 33-test suite) but isn't
yet the implementation any L4 adapter actually calls; adapters still resolve `createPolymorphic`
from the pre-`pipeline-kit` implementation. Promoting it is a future step, not yet done.

Development: `pnpm --filter @praxis-kit/pipeline-kit test`, `typecheck`, `lint`.
