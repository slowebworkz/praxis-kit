import { Slot } from '@radix-ui/react-slot'
import { createPolymorphic } from '@polymorphic-ui/core'
import type { AnyRecord, ElementType, VariantMap, VariantProps } from '@polymorphic-ui/core'
import type { ReactElement, Ref } from 'react'
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
  const runtime = createPolymorphic(options) as unknown as AnyRuntime

  function Component({
    ref,
    ...props
  }: Record<string, unknown> & { ref?: Ref<unknown> }): ReactElement {
    return render({
      runtime,
      props,
      ref: ref ?? null,
      slotComponent,
      normalizeChildren,
      ...(filterProps !== undefined && { filterProps }),
    })
  }

  Component.displayName = options.displayName ?? 'PolymorphicComponent'
  return Component as unknown as PolymorphicComponent<TDefault, Props, Variants, TPreset>
}
