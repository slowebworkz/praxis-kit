import type {
  AnyRecord,
  ElementType,
  PolymorphicGenerics,
  PolymorphicRuntime,
  VariantMap,
  VariantSelection,
} from '@praxis-ui/core'

export type Runtime<G extends PolymorphicGenerics> = PolymorphicRuntime<
  G['default'],
  G['props'],
  G['variants'],
  never,
  G['preset']
>

export type LooseRuntime = PolymorphicRuntime<
  ElementType,
  AnyRecord,
  VariantMap,
  string,
  Record<string, VariantSelection<VariantMap>>
>
