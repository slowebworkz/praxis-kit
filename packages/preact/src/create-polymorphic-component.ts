import type {
  AnyRecord,
  ElementType,
  PolymorphicGenerics,
  PresetMap,
  VariantMap,
} from '@polymorphic-ui/core'
import { forwardRef } from 'preact/compat'
import type { ForwardedRef } from 'preact/compat'
import { normalizeChildren } from './normalize-children'
import { applyDisplayName } from './apply-display-name'
import { buildRuntime } from './build-runtime'
import { render } from './render'
import type { PreactFactoryOptions } from './preact-options'
import type { AnyVNode, UnknownProps, KnownProps, PolymorphicComponent } from './types'

export function createPolymorphicComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<Record<never, never>>,
  TPluginProps extends AnyRecord = Record<never, never>,
>(options: PreactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>) {
  const bundle = buildRuntime(options as PreactFactoryOptions<TDefault, Props, Variants, TPreset>)

  // forwardRef from preact/compat is required for refs to reach the underlying DOM element.
  const Component = forwardRef(function Component(
    props: Record<string, unknown>,
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
