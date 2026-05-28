import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  PolymorphicGenerics,
  PresetMap,
  VariantMap,
} from '@praxis-ui/core'
import { createPolymorphic } from '@praxis-ui/core/primitive'
import { buildEngines, composeFilter } from '@praxis-ui/adapter-utils'
import type { Ref, ReactElement } from 'react'
import { Slot } from './slot'
import { normalizeChildren } from './normalize-children'
import { applyDisplayName, render } from '@/shared'
import { SlotValidator } from '@/shared'
import type { UnknownProps, KnownProps, PolymorphicComponent, ReactFactoryOptions } from '@/shared'

// Children-only enforcement factory: ChildrenEvaluator, no AriaPolicyEngine, no class pipeline.
// Tree-shakes lib/styling/src and lib/contract/src/aria for consumers that only need structural contracts.
export function createChildrenEnforcedComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>) {
  const name = options.name ?? 'PolymorphicComponent'
  const strict = options.enforcement?.strict ?? 'throw'
  const slotComponent = options.slotComponent ?? Slot

  const runtime = createPolymorphic(options)
  const filterProps = composeFilter(undefined, options.filterProps)
  const slotValidator = new SlotValidator(name, strict)
  const { childrenEvaluator } = buildEngines(strict, options.enforcement?.children, name)

  function Component({ ref, ...props }: UnknownProps & { ref?: Ref<unknown> }): ReactElement {
    return render({
      runtime,
      props: props as KnownProps,
      ref: ref ?? null,
      slotComponent,
      normalizeChildren,
      filterProps,
      slotValidator,
      ...(childrenEvaluator !== undefined && { childrenEvaluator }),
    })
  }

  applyDisplayName(Component, name)
  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>
  >
}
