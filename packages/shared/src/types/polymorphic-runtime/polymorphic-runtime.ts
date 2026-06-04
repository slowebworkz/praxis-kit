import type { AnyRecord, ElementType } from '../primitives'
import type { ClassPlugin } from '../class'
import type { ResolvedFactoryOptions } from '../factory'
import type { PresetMap, VariantMap, VariantSelection } from '../variants'
import type { ResolveAriaFn } from './resolve-aria-fn'
import type { ResolveClassNameFn } from './resolve-class-name-fn'
import type { ResolvePropsFn } from './resolve-props-fn'
import type { ResolveTagFn } from './resolve-tag-fn'
import type { RuntimePluginField } from './runtime-plugin-field'

export type PolymorphicRuntime<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends VariantMap,
  TSlot extends string = never,
  TPreset extends PresetMap<Variants> = Readonly<Record<string, VariantSelection<Variants>>>,
  TPlugin extends ClassPlugin | undefined = ClassPlugin | undefined,
> = RuntimePluginField<TPlugin> & {
  readonly options: Readonly<ResolvedFactoryOptions<TDefault, Props, Variants, TPreset>>
  readonly resolveTag: ResolveTagFn<TDefault>
  readonly resolveProps: ResolvePropsFn<Props>
  readonly resolveClasses: ResolveClassNameFn<Props, TSlot>
  readonly resolveAria: ResolveAriaFn
}
