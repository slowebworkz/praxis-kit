import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  PolymorphicGenerics,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { createPolymorphic } from '@praxis-kit/core/primitive'
import { composeFilter } from '@praxis-kit/adapter-utils'
import type { Ref, ReactElement } from 'react'
import { Slot } from './slot'
import { normalizeChildren } from './normalize-children'
import { applyDisplayName, render } from '../shared'
import { SlotValidator } from '../shared'
import type { UnknownProps, KnownProps, PolymorphicComponent, ReactFactoryOptions } from '../shared'

// Primitive factory — tag resolution, prop merge, asChild, no styling runtime, no contract engine.
export function createPolymorphicComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>) {
  const name = options.name ?? 'PolymorphicComponent'
  const slotComponent = options.slotComponent ?? Slot

  const runtime = createPolymorphic(options)
  const filterProps = composeFilter(new Set(), options.filterProps)
  const slotValidator = new SlotValidator(name, 'throw')

  function Component({ ref, ...props }: UnknownProps & { ref?: Ref<unknown> }): ReactElement {
    return render({
      runtime,
      props: props as KnownProps,
      ref: ref ?? null,
      slotComponent,
      normalizeChildren,
      filterProps,
      slotValidator,
    })
  }

  applyDisplayName(Component, name)
  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>
  >
}
