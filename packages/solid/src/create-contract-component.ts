import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  PolymorphicGenerics,
  PresetMap,
  VariantMap,
} from '@praxis-kit/core'
import { COMPONENT_DEFAULT_TAG } from '@praxis-kit/shared/guards/children'
import { applyDisplayName } from './apply-display-name'
import { buildRuntime } from './build-runtime'
import { render } from './render'
import type { SolidFactoryOptions } from './solid-options'
import type { KnownProps, PolymorphicComponent, SolidElement, UnknownProps } from './types'

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
>(options: SolidFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>) {
  const bundle = buildRuntime(options as SolidFactoryOptions<TDefault, Props, Variants, TPreset>)

  const Component = (props: UnknownProps): SolidElement => {
    return render({
      ...bundle,
      props: props as KnownProps,
    })
  }

  applyDisplayName(Component, options.name)
  if (typeof bundle.runtime.options.defaultTag === 'string') {
    Object.assign(Component, { [COMPONENT_DEFAULT_TAG]: bundle.runtime.options.defaultTag })
  }
  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>
  >
}
