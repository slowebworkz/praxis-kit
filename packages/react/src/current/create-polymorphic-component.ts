import type { ElementType, VariantMap, VariantProps } from '@polymorphic-ui/core'
import type { ReactElement, Ref } from 'react'
import { Slot } from './slot'
import { normalizeChildren } from './normalize-children'
import { applyDisplayName, buildRuntime, render } from '@/shared'
import type { UnknownProps, KnownProps, PolymorphicComponent, ReactFactoryOptions } from '@/shared'

export function createPolymorphicComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>> = Record<never, never>,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset>) {
  const bundle = buildRuntime(options, Slot, normalizeChildren)

  function Component({
    ref,
    ...props
  }: Record<string, unknown> & { ref?: Ref<unknown> }): ReactElement {
    return render({ ...bundle, props: props as KnownProps, ref: ref ?? null })
  }

  applyDisplayName(Component, options.displayName)
  return Component as unknown as PolymorphicComponent<TDefault, Props, Variants, TPreset>
}
