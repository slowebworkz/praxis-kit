import { defineComponent } from 'vue'
import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  PolymorphicGenerics,
  PresetMap,
  VariantMap,
} from '@polymorphic-ui/core'
import { applyDisplayName } from './apply-display-name'
import { buildRuntime } from './build-runtime'
import { render } from './render'
import type { VueFactoryOptions } from './vue-options'
import type { UnknownProps, PolymorphicComponent } from './types'

export function createPolymorphicComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
>(options: VueFactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps>) {
  const bundle = buildRuntime(options as VueFactoryOptions<TDefault, Props, Variants, TPreset>)

  const Component = defineComponent({
    name: options.name ?? 'PolymorphicComponent',
    // Without inheritAttrs: false Vue would double-bind attrs onto the root element
    // before our render pipeline has a chance to filter, transform, and re-apply them.
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      return () => render({ ...bundle, attrs, slots })
    },
  })

  // Vue devtools reads `name`; external consumers read `displayName` (React adapter convention).
  applyDisplayName(Component, options.name)
  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & TPluginProps, Variants, TPreset>
  >
}
