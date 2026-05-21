import type {
  AnyRecord,
  ElementType,
  PolymorphicGenerics,
  PresetMap,
  VariantMap,
} from '@polymorphic-ui/core'
import { forwardRef } from 'react'
import type { ReactElement } from 'react'
import { Slot } from './slot'
import { normalizeChildren } from './normalize-children'
import { applyDisplayName, buildRuntime, render } from '@/shared'
import type { UnknownProps, KnownProps, PolymorphicComponent, ReactFactoryOptions } from '@/shared'

export function createPolymorphicComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<Record<never, never>>,
  TPluginProps extends AnyRecord = Record<never, never>,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>) {
  const bundle = buildRuntime(
    options as ReactFactoryOptions<TDefault, Props, Variants, TPreset>,
    Slot,
    normalizeChildren,
  )

  const Component = forwardRef<unknown, Record<string, unknown>>(
    function PolymorphicComponent(props, ref): ReactElement {
      return render({ ...bundle, props: props as KnownProps, ref })
    },
  )

  applyDisplayName(Component, options.name)
  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>
  >
}
