import type {
  DefaultOf,
  FactoryOptions,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  VariantsOf,
} from '@praxis-kit/core'
import { createPolymorphic2 } from '@praxis-kit/core'

const EMPTY_SET: ReadonlySet<string> = new Set()

/**
 * React-only experiment: identical to `@praxis-kit/adapter-utils`'s `buildCoreRuntime`, except
 * it calls `createPolymorphic2` (the pipeline-kit-built runtime — see packages/core/src/factory/
 * create-polymorphic2.ts) instead of the pre-pipeline-kit `createPolymorphic`. Solid/Lit/Web/
 * Svelte are untouched; only React resolves through this path, so the blast radius of this
 * experiment is contained to one adapter.
 */
export function buildCoreRuntime<G extends PolymorphicGenerics>(
  normalized: FactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>,
) {
  const runtime = createPolymorphic2(normalized)
  // classPlugin is absent when no styling plugin is provided; fall back to EMPTY_SET
  // so consumers can call ownedKeys.has(key) unconditionally.
  const ownedKeys: ReadonlySet<string> =
    'classPlugin' in runtime ? (runtime.classPlugin.ownedKeys ?? EMPTY_SET) : EMPTY_SET
  return { runtime, ownedKeys }
}
