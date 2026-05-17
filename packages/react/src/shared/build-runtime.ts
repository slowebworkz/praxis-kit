import { createPolymorphic, ChildrenEvaluator } from '@polymorphic-ui/core'
import type { ElementType, VariantMap, VariantProps } from '@polymorphic-ui/core'
import type { ReactElement } from 'react'
import { SlotValidator } from './slot/slot-validator'
import type { ReactFactoryOptions } from './react-options'
import type { UnknownProps, SlotComponent, Runtime, FilterPredicate } from './types'

export function buildRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
>(
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset>,
  defaultSlot: SlotComponent,
  normalizeChildren: (children: unknown) => ReactElement[],
) {
  const { slotComponent = defaultSlot, filterProps, childRules, displayName, strict } = options
  const resolvedStrict = strict ?? 'throw'
  const name = displayName ?? 'PolymorphicComponent'

  const runtime = createPolymorphic({
    ...options,
    strict: resolvedStrict,
  }) as unknown as Runtime

  const slotValidator = new SlotValidator(name, resolvedStrict)
  const childrenEvaluator = childRules?.length
    ? new ChildrenEvaluator(childRules, resolvedStrict, name)
    : undefined

  const defaultFilter: FilterPredicate = (key, variantKeys) => variantKeys.has(key)
  const resolvedFilter: FilterPredicate = filterProps
    ? (key, variantKeys) => variantKeys.has(key) || filterProps(key, variantKeys)
    : defaultFilter

  return {
    runtime,
    slotComponent,
    normalizeChildren,
    slotValidator,
    filterProps: resolvedFilter,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  }
}
