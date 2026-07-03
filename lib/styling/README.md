# @praxis-kit/styling

The styling runtime — variant resolution and class composition.

| Piece                   | Source                       | Purpose                                                                    |
| ----------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `createClassPipeline`   | `create-class-pipeline.ts`   | Builds the per-factory pipeline from `styling` options                     |
| `StaticClassResolver`   | `static-class-resolver.ts`   | Base class + tag-map lookup (LRU-cached per tag)                           |
| `VariantClassResolver`  | `variant-class-resolver.ts`  | CVA variants, compounds, presets (LRU cache, 1000 entries)                 |
| `cva`                   | `cva.ts`                     | CVA integration layer                                                      |
| `diagnoseClassPipeline` | `diagnose-class-pipeline.ts` | Side-effect-free trace: compound firing, tag-map bypass, preset resolution |

The pipeline is additive — it never removes classes. CSS-methodology post-processing (like
Tailwind's layout-aware stripping) is a `ClassPlugin` layered on top by
[lib/tailwind](../tailwind/), not part of this package.

Private workspace, consumed by `packages/core`. Pipeline architecture and the plugin factory-time /
render-time contract are documented in [ARCHITECTURE.md](../../ARCHITECTURE.md).

Development: `pnpm --filter @praxis-kit/styling test`, `typecheck`, `lint`.
