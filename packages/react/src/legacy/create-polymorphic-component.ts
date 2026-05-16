import type { AnyRecord, ElementType, VariantMap, VariantProps } from '@polymorphic-ui/core'
import { forwardRef } from 'react'
import type { ReactElement } from 'react'
import { Slot } from './slot'
import { normalizeChildren } from './normalize-children'
import { applyDisplayName, buildRuntime, render } from '@/shared'
import type { PolymorphicComponent, ReactFactoryOptions } from '@/shared'

export function createPolymorphicComponent<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>> = Record<never, never>,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset>) {
  const bundle = buildRuntime(options, Slot, normalizeChildren)

  const Component = forwardRef<unknown, Record<string, unknown>>(
    function PolymorphicComponent(props, ref): ReactElement {
      return render({ ...bundle, props, ref })
    },
  )

  applyDisplayName(Component, options.displayName)
  return Component as unknown as PolymorphicComponent<TDefault, Props, Variants, TPreset>
}
