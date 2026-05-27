import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  PolymorphicGenerics,
  PresetMap,
  VariantMap,
} from '@praxis-ui/core'
import { forwardRef } from 'preact/compat'
import type { ForwardedRef } from 'preact/compat'
import { normalizeChildren } from './normalize-children'
import { applyDisplayName } from './apply-display-name'
import { buildRuntime } from './build-runtime'
import { render } from './render'
import type { PreactFactoryOptions } from './preact-options'
import type { AnyVNode, UnknownProps, KnownProps, PolymorphicComponent } from './types'

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
>(options: PreactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>) {
  const bundle = buildRuntime(options as PreactFactoryOptions<TDefault, Props, Variants, TPreset>)

  // forwardRef from preact/compat is required for refs to reach the underlying DOM element.
  const Component = forwardRef(function Component(
    props: UnknownProps,
    ref: ForwardedRef<unknown>,
  ): AnyVNode {
    return render({
      ...bundle,
      normalizeChildren,
      props: props as KnownProps,
      ref: ref ?? null,
    })
  })

  applyDisplayName(Component, options.name)
  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>
  >
}
