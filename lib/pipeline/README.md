# @praxis-kit/pipeline

Generic multi-pass pipeline primitives: build a pipeline from processors, start it with an input,
execute passes, and short-circuit on failure. No praxis-specific knowledge lives here — it is the
reusable machinery beneath the diagnostics engine and the compiler passes in `plugins/vite`.

Private workspace, bundled into whichever `praxis-kit` entries need it.

---

## Exports

| Export                | Purpose                                              |
| --------------------- | ---------------------------------------------------- |
| `createPipeline`      | Compose an ordered set of processors into a pipeline |
| `startPipeline`       | Seed a pipeline run with its initial input           |
| `executePipeline`     | Run all passes to completion                         |
| `executeProcessor`    | Run a single processor step                          |
| `isPass` / `isObject` | Guards for processor results                         |
| `types`               | Processor, pass, and context type definitions        |

The vite-plugin compiler work is converging on this package's shared AST + pass-context model;
prefer extending these primitives over growing bespoke pass loops elsewhere.

Development: `pnpm --filter @praxis-kit/pipeline test`, `typecheck`, `lint`.
