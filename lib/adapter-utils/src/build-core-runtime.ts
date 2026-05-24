import type {
  DefaultOf,
  FactoryOptions,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  VariantsOf,
} from '@polymorphic-ui/core'
import { createPolymorphic } from '@polymorphic-ui/core'

export function buildCoreRuntime<G extends PolymorphicGenerics>(
  normalized: FactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>,
) {
  const runtime = createPolymorphic(normalized)
  // classPlugin is absent when no styling plugin is provided; `in` guard avoids property access on undefined.
  const ownedKeys = 'classPlugin' in runtime ? runtime.classPlugin.ownedKeys : undefined
  return { runtime, ownedKeys }
}
