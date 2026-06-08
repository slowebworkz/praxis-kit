import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  PolymorphicGenerics,
  PresetMap,
  VariantMap,
} from '@praxis-kit/core'
import { forwardRef } from 'react'
import type { ReactElement } from 'react'
import { Slot } from './slot'
import { normalizeChildren } from './normalize-children'
import { applyDisplayName, buildRuntime, render } from '@praxis-kit/react/shared'
import type {
  UnknownProps,
  KnownProps,
  PolymorphicComponent,
  ReactFactoryOptions,
} from '@praxis-kit/react/shared'

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>) {
  const bundle = buildRuntime(
    options as ReactFactoryOptions<TDefault, Props, Variants, TPreset>,
    Slot,
    normalizeChildren,
  )

  const Component = forwardRef<unknown, UnknownProps>(
    function PolymorphicComponent(props, ref): ReactElement {
      return render({ ...bundle, props: props as KnownProps, ref })
    },
  )

  applyDisplayName(Component, options.name)
  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>
  >
}
