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
import { createContractedPolymorphic } from '@praxis-kit/core/contract'
import { buildEngines, composeFilter } from '@praxis-kit/adapter-utils'
import { forwardRef } from 'react'
import type { ReactElement } from 'react'
import { Slot } from './slot'
import { normalizeChildren } from './normalize-children'
import { applyDisplayName, render } from '../shared'
import { SlotValidator } from '../shared'
import type { UnknownProps, KnownProps, PolymorphicComponent, ReactFactoryOptions } from '../shared'

// Enforcement-only factory: AriaPolicyEngine + ChildrenEvaluator, no class pipeline.
// Tree-shakes lib/styling/src for consumers that only need structural contracts.
export function createContractedComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends ClassPluginFactory<AnyRecord> | undefined =
    | ClassPluginFactory<AnyRecord>
    | undefined,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin>) {
  const name = options.name ?? 'PolymorphicComponent'
  const strict = options.enforcement?.strict ?? 'throw'
  const slotComponent = options.slotComponent ?? Slot

  const runtime = createContractedPolymorphic(options)
  const filterProps = composeFilter(new Set(), options.filterProps)
  const slotValidator = new SlotValidator(name, strict)
  const { childrenEvaluator } = buildEngines(strict, options.enforcement?.children, name)

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
        ...(childrenEvaluator !== undefined && { childrenEvaluator }),
      })
    },
  )

  applyDisplayName(Component, name)
  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>
  >
}
