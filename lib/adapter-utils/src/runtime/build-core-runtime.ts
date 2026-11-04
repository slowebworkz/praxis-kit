import type {
  DefaultOf,
  FactoryOptions,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  VariantsOf,
} from '@praxis-kit/core'
import { createPolymorphic } from '@praxis-kit/core'

const EMPTY_SET: ReadonlySet<string> = new Set()

export function buildCoreRuntime<G extends PolymorphicGenerics>(
  normalized: FactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>,
) {
  // Core owns optional composition-pipeline construction. The adapter layer only exposes the
  // resulting resolver to framework-specific rendering code.
  const runtime = createPolymorphic(normalized)
  const compositionClassResolver = runtime.compositionClassResolver
  // classPlugin is absent when no styling plugin is provided; fall back to EMPTY_SET
  // so consumers can call ownedKeys.has(key) unconditionally.
  const componentOwnedKeys: ReadonlySet<string> =
    'classPlugin' in runtime ? (runtime.classPlugin.ownedKeys ?? EMPTY_SET) : EMPTY_SET
  // A composed pipeline can own keys that the primary component's standalone plugin does not.
  // Reserve the union at the adapter boundary so neither set leaks to a host element or child.
  const ownedKeys: ReadonlySet<string> = new Set([
    ...componentOwnedKeys,
    ...(compositionClassResolver?.ownedKeys ?? EMPTY_SET),
  ])
  return { runtime, ownedKeys, ...(compositionClassResolver && { compositionClassResolver }) }
}
