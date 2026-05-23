import type {
  AnyRecord,
  ElementType,
  PolymorphicGenerics,
  PresetMap,
  VariantMap,
} from '@polymorphic-ui/core'
import { applyDisplayName } from './apply-display-name'
import { buildRuntime } from './build-runtime'
import { render } from './render'
import type { SolidFactoryOptions } from './solid-options'
import type { KnownProps, PolymorphicComponent, SolidElement, UnknownProps } from './types'

export function createPolymorphicComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<Record<never, never>>,
  TPluginProps extends AnyRecord = Record<never, never>,
>(options: SolidFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>) {
  const bundle = buildRuntime(options as SolidFactoryOptions<TDefault, Props, Variants, TPreset>)

  const Component = (props: Record<string, unknown>): SolidElement => {
    return render({
      ...bundle,
      props: props as KnownProps,
    })
  }

  applyDisplayName(Component, options.name)
  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>
  >
}
