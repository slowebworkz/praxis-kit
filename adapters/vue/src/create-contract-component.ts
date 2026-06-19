import { computed, defineComponent } from 'vue'
import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  PolymorphicGenerics,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { COMPONENT_DEFAULT_TAG } from '@praxis-kit/shared/guards/children'
import { applyDisplayName } from './apply-display-name'
import { buildRuntime } from './build-runtime'
import { render, resolveRenderState } from './render'
import type { VueFactoryOptions } from './vue-options'
import type { UnknownProps, PolymorphicComponent } from './types'

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
>(options: VueFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>) {
  const bundle = buildRuntime(options as VueFactoryOptions<TDefault, Props, Variants, TPreset>)

  const Component = defineComponent({
    name: options.name ?? 'PolymorphicComponent',
    // Without inheritAttrs: false Vue would double-bind attrs onto the root element
    // before our render pipeline has a chance to filter, transform, and re-apply them.
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      // Steps 1–4 (pure: resolveTag, resolveProps, resolveClasses, filterProps) are wrapped
      // in computed() so Vue's reactivity layer skips them when attrs haven't changed.
      // Steps 5–6 (side-effecting: childrenEvaluator, resolveAria) run inside the render fn.
      const resolvedState = computed(() =>
        resolveRenderState(bundle.runtime, attrs, bundle.filterProps),
      )
      return () => render({ ...bundle, attrs, slots, resolvedState: resolvedState.value })
    },
  })

  // Vue devtools reads `name`; external consumers read `displayName` (React adapter convention).
  applyDisplayName(Component, options.name)
  if (typeof bundle.runtime.options.defaultTag === 'string') {
    Object.assign(Component, { [COMPONENT_DEFAULT_TAG]: bundle.runtime.options.defaultTag })
  }
  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>
  >
}
