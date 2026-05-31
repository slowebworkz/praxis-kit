import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  PolymorphicGenerics,
  PresetMap,
  VariantMap,
} from '@praxis-ui/core'
import { createContractedPolymorphic } from '@praxis-ui/core/contract'
import { buildEngines, composeFilter } from '@praxis-ui/adapter-utils'
import { forwardRef } from 'react'
import type { ReactElement } from 'react'
import { Slot } from './slot'
import { normalizeChildren } from './normalize-children'
import { applyDisplayName, render } from '@praxis-ui/react/shared'
import { SlotValidator } from '@praxis-ui/react/shared'
import type {
  UnknownProps,
  KnownProps,
  PolymorphicComponent,
  ReactFactoryOptions,
} from '@praxis-ui/react/shared'

// Enforcement-only factory: AriaPolicyEngine + ChildrenEvaluator, no class pipeline.
// Tree-shakes lib/styling/src for consumers that only need structural contracts.
export function createContractedComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>) {
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
    PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>
  >
}
