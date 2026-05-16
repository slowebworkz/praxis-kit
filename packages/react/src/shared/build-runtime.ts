import { createPolymorphic } from '@polymorphic-ui/core'
import type { AnyRecord, ElementType, VariantMap, VariantProps } from '@polymorphic-ui/core'
import type { ComponentType, ReactElement } from 'react'
import type { ReactFactoryOptions } from './react-options'
import type { AnyRuntime } from './types'

export function buildRuntime<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
>(
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset>,
  defaultSlot: ComponentType<AnyRecord>,
  normalizeChildren: (children: unknown) => ReactElement[],
) {
  const { slotComponent = defaultSlot, filterProps } = options
  const runtime = createPolymorphic({
    ...options,
    strict: options.strict ?? 'throw',
  }) as unknown as AnyRuntime

  return {
    runtime,
    slotComponent,
    normalizeChildren,
    ...(filterProps !== undefined && { filterProps }),
  }
}
