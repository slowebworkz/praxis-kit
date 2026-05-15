import { createPolymorphic } from '@polymorphic-ui/core'
import type { AnyRecord, ElementType, VariantMap, VariantProps } from '@polymorphic-ui/core'
import { forwardRef } from 'react'
import type { ReactElement } from 'react'
import { Slot } from './slot/Slot'
import { normalizeChildren } from './normalize-children'
import { render } from '../shared'
import type { AnyRuntime, PolymorphicComponent, ReactFactoryOptions } from '../shared'

export function createPolymorphicComponent<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>> = Record<never, never>,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset>) {
  const { slotComponent = Slot, filterProps } = options
  const runtime = createPolymorphic({
    ...options,
    strict: options.strict ?? 'throw',
  }) as unknown as AnyRuntime

  const Component = forwardRef<unknown, Record<string, unknown>>(
    function PolymorphicComponent(props, ref): ReactElement {
      return render({
        runtime,
        props,
        ref,
        slotComponent,
        normalizeChildren,
        ...(filterProps !== undefined && { filterProps }),
      })
    },
  )

  Component.displayName = options.displayName ?? 'PolymorphicComponent'
  return Component as unknown as PolymorphicComponent<TDefault, Props, Variants, TPreset>
}
