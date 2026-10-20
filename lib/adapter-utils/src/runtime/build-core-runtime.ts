import type {
  DefaultOf,
  FactoryOptions,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  VariantsOf,
} from '@praxis-kit/core'
import { createPolymorphic } from '@praxis-kit/core'
import { createOptionalCompositionStylePipeline } from './composition-style-metadata'
import type { CompositionClassResolver, CompositionRuntimeConfig } from './types'

const EMPTY_SET: ReadonlySet<string> = new Set()

export function buildCoreRuntime<G extends PolymorphicGenerics>(
  normalized: FactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, RecipeOf<G>>,
  compose?: CompositionRuntimeConfig,
  onCompositionDiagnostic?: (message: string) => void,
) {
  const runtime = createPolymorphic(normalized)
  // Resolve composition metadata once at construction. Adapters still own framework rendering,
  // but no longer decide independently how the optional styling pipeline is constructed.
  const compositionClassResolver: CompositionClassResolver | undefined =
    createOptionalCompositionStylePipeline({
      primary: runtime.options,
      with: compose?.with,
      ...(compose?.defaults !== undefined && { composeDefaults: compose.defaults }),
      ...(onCompositionDiagnostic && { onDiagnostic: onCompositionDiagnostic }),
    })
  // classPlugin is absent when no styling plugin is provided; fall back to EMPTY_SET
  // so consumers can call ownedKeys.has(key) unconditionally.
  const ownedKeys: ReadonlySet<string> =
    'classPlugin' in runtime ? (runtime.classPlugin.ownedKeys ?? EMPTY_SET) : EMPTY_SET
  return { runtime, ownedKeys, compositionClassResolver }
}
