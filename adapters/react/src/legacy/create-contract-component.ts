import type {
  AnyClassPluginFactory,
  ElementType,
  EmptyRecord,
  ExtractPluginProps,
  PolymorphicGenerics,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { COMPONENT_DEFAULT_TAG, isString } from '@praxis-kit/primitive'
import type { ReactElement, Ref } from 'react'
import { forwardRef } from 'react'
import type { PolymorphicComponent, ReactFactoryOptions, UnknownProps } from '../shared'
import { applyDisplayName, render } from '../shared'
import { buildRuntime } from './build-runtime'

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin, TAllowed>) {
  const bundle = buildRuntime(options as ReactFactoryOptions<TDefault, Props, Variants, TPreset>)

  // React 18: ref is not available as a plain prop — forwardRef is required.
  const Component = forwardRef<unknown, UnknownProps>(function Component(
    props: UnknownProps,
    ref: Ref<unknown> | null,
  ): ReactElement {
    return render({ ...bundle, props, ref })
  })

  applyDisplayName(Component, options.name)
  const defaultTag = bundle.runtime.options.defaultTag
  if (isString(defaultTag)) {
    Object.assign(Component, { [COMPONENT_DEFAULT_TAG]: defaultTag })
  }

  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset, TAllowed>
  >
}
