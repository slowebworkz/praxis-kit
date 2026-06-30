import type {
  AnyRecord,
  ClassPluginFactory,
  ElementType,
  EmptyRecord,
  ExtractPluginProps,
  PolymorphicGenerics,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { createPolymorphic } from '@praxis-kit/core/primitive'
import { composeFilter } from '@praxis-kit/adapter-utils'
import { throwDiagnostics } from '@praxis-kit/diagnostics'
import { forwardRef } from 'react'
import type { ReactElement } from 'react'
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
  TPlugin extends ClassPluginFactory<AnyRecord> | undefined =
    | ClassPluginFactory<AnyRecord>
    | undefined,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin>) {
  const name = options.name ?? 'PolymorphicComponent'
  const slotComponent = options.slotComponent ?? Slot

  const runtime = createPolymorphic(options)
  const filterProps = composeFilter(new Set(), options.filterProps)
  const slotValidator = new SlotValidator(name, throwDiagnostics)

  const Component = forwardRef<unknown, UnknownProps>(
    function PolymorphicComponent(props, ref): ReactElement {
      return render({
        runtime,
        props: props as KnownProps,
        ref,
        slotComponent,
        normalizeChildren,
        filterProps,
        slotValidator,
      })
    },
  )

  applyDisplayName(Component, name)
  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>
  >
}
