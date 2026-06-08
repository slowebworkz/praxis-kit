import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  PolymorphicGenerics,
  PresetMap,
  VariantMap,
} from '@praxis-kit/core'
import { createContractedPolymorphic } from '@praxis-kit/core/contract'
import { composeFilter } from '@praxis-kit/adapter-utils'
import { forwardRef } from 'react'
import type { ReactElement } from 'react'
import { Slot } from './slot'
import { normalizeChildren } from './normalize-children'
import { applyDisplayName, render } from '@praxis-kit/react/shared'
import { SlotValidator } from '@praxis-kit/react/shared'
import type {
  UnknownProps,
  KnownProps,
  PolymorphicComponent,
  ReactFactoryOptions,
} from '@praxis-kit/react/shared'

// ARIA-only enforcement factory: AriaPolicyEngine, no ChildrenEvaluator, no class pipeline.
// Tree-shakes lib/styling/src and lib/contract/src/children for consumers that only need ARIA contracts.
export function createAriaEnforcedComponent<
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
    PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>
  >
}
