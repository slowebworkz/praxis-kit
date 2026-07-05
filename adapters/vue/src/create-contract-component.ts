import { cloneVNode, computed, defineComponent } from 'vue'
import type { FilterPredicate } from '@praxis-kit/adapter-utils'
import {
  applyPropNormalizers,
  buildEngines,
  resolveAdapterCommonOptions,
  applyAria,
  applyFilterProps,
  buildDefinition,
  buildStylePipeline,
  flattenClassName,
  joinClasses,
} from '@praxis-kit/adapter-utils'
import type {
  CompoundRecord,
  Defaults,
  PresetRecord,
  StylePipeline,
  VariantRecord,
} from '@praxis-kit/adapter-utils'
import type {
  AnyClassPlugin,
  AnyClassPluginFactory,
  AnyRecord,
  ClassPipelineOptions,
  ClassPluginFactory,
  ElementType,
  EmptyRecord,
  ExtractPluginProps,
  PolymorphicGenerics,
  PropNormalizer,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import { enforceAllowedAs, getHtmlChildrenEvaluator } from '@praxis-kit/core'
import { AriaPolicyEngine } from '@praxis-kit/core/contract'
import { COMPONENT_DEFAULT_TAG } from '@praxis-kit/primitive/guards/children'
import type { NodeDecoration } from '@praxis-kit/runtime'
import { applyAttributes } from '@praxis-kit/runtime'
import type { NodeId } from '@praxis-kit/pipeline'
import { extractDecoration } from './backend/extract-decoration'
import { applyDisplayName } from './apply-display-name'
import { renderNormally } from './helpers'
import { normalizeChildren } from './normalize-children'
import { SlotValidator } from './slot'
import { extractSlottable } from './slot/extractSlottable'
import type { UnknownProps, PolymorphicComponent } from './types'
import type { VueFactoryOptions } from './vue-options'

declare const process: { env: { NODE_ENV: string } }

const EMPTY_SET: ReadonlySet<string> = new Set()

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
>(options: VueFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin>) {
  const resolved = resolveAdapterCommonOptions(options)
  const displayName = resolved.name
  const defaultTag = (options.tag as string | undefined) ?? 'div'

  const definition = buildDefinition(displayName, defaultTag)
  const variantKeys = new Set(Object.keys(options.styling?.variants ?? {}))
  const domDefaults = options.defaults as AnyRecord | undefined
  const stylePipeline: StylePipeline | undefined = buildStylePipeline(
    options.styling?.variants as VariantRecord | undefined,
    options.styling?.presets as PresetRecord | undefined,
    (options.styling?.defaults ?? {}) as Defaults,
    options.styling?.compounds as ReadonlyArray<CompoundRecord> | undefined,
    undefined,
  )
  const base =
    options.styling?.base !== undefined ? flattenClassName(options.styling.base) : undefined
  const filterFn = options.filterProps as FilterPredicate | undefined
  const allowedAs = options.enforcement?.allowedAs as readonly ElementType[] | undefined
  const normalizeFn = options.normalize as ((props: AnyRecord) => AnyRecord) | undefined
  const enforcementNormalizers = options.enforcement?.props as readonly PropNormalizer[] | undefined

  const classPlugin: AnyClassPlugin =
    options.styling?.plugin !== undefined
      ? (options.styling.plugin as ClassPluginFactory<AnyRecord>)(
          options.styling as unknown as ClassPipelineOptions,
          resolved.diagnostics,
        )
      : undefined
  const pluginKeys: ReadonlySet<string> = classPlugin?.ownedKeys ?? EMPTY_SET

  const { childrenEvaluator: explicitEvaluator } = buildEngines(
    resolved.diagnostics,
    options.enforcement?.children,
    displayName,
  )

  const ariaEngine =
    options.enforcement !== undefined ? new AriaPolicyEngine(resolved.diagnostics) : undefined

  const slotValidator = new SlotValidator(displayName, resolved.diagnostics, 'VNode')

  const Component = defineComponent({
    name: displayName,
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      // Wrap pure prop resolution in computed() so Vue's reactivity skips it when attrs unchanged
      const decorationState = computed(() => {
        const {
          as,
          asChild,
          class: callerClass,
          recipe,
          ...ownProps
        } = attrs as {
          as?: string
          asChild?: boolean
          class?: string
          recipe?: string
          [key: string]: unknown
        }

        const tag = typeof as === 'string' ? as : defaultTag

        if (allowedAs !== undefined)
          enforceAllowedAs(tag, allowedAs, resolved.diagnostics, displayName)

        const rawBaseProps =
          domDefaults !== undefined ? { ...domDefaults, ...ownProps } : (ownProps as AnyRecord)
        const normalizedProps = applyPropNormalizers(tag, rawBaseProps, enforcementNormalizers)
        const baseProps = normalizeFn !== undefined ? normalizeFn(normalizedProps) : normalizedProps

        const pluginProps: AnyRecord = {}
        const propsForExtraction: AnyRecord =
          pluginKeys.size > 0
            ? Object.fromEntries(
                Object.entries(baseProps).filter(([k]) => {
                  if (pluginKeys.has(k)) {
                    pluginProps[k] = baseProps[k]
                    return false
                  }
                  return true
                }),
              )
            : baseProps

        const rootDec = extractDecoration(propsForExtraction, variantKeys)
        const decoration = applyAria(
          Object.keys(rootDec).length > 0 ? { root: rootDec } : {},
          tag,
          ariaEngine,
        )

        const recipeName = typeof recipe === 'string' ? recipe : undefined
        const { variantClasses, compoundClasses } = stylePipeline
          ? stylePipeline.execute(decoration, recipeName)
          : { variantClasses: [], compoundClasses: [] }

        const rawClassName = joinClasses(
          base,
          ...variantClasses,
          ...compoundClasses,
          typeof callerClass === 'string' ? callerClass : undefined,
        )
        const className =
          classPlugin !== undefined
            ? classPlugin.pipeline(tag, pluginProps, rawClassName, recipeName)
            : rawClassName

        let finalDecoration: Record<NodeId, NodeDecoration> = className
          ? applyAttributes('root', { className }, decoration, variantKeys)
          : decoration

        finalDecoration = applyFilterProps(finalDecoration, filterFn, variantKeys)

        return { tag, asChild, as, finalDecoration, className }
      })

      return () => {
        const { tag, asChild, as, finalDecoration, className } = decorationState.value

        const { vnodes: children, discarded } = normalizeChildren(slots)

        if (process.env.NODE_ENV !== 'production') {
          const childEval = explicitEvaluator ?? getHtmlChildrenEvaluator(tag)
          childEval?.evaluate(children)
        }

        if (asChild === true) {
          if (typeof as === 'string') {
            slotValidator.assertExclusive()
          } else {
            if (discarded > 0) slotValidator.warnDiscardedChildren(discarded)
            const extraction = extractSlottable(children)
            if (extraction) {
              return extraction.rebuild(
                cloneVNode(extraction.child, {
                  ...finalDecoration['root']?.attributes,
                  class: className,
                }),
              )
            }
            if (children.length === 1 && children[0] !== undefined) {
              return cloneVNode(children[0], {
                ...finalDecoration['root']?.attributes,
                class: className,
              })
            }
            slotValidator.assertSingleChild(children.length)
            return null
          }
        }

        return renderNormally(definition, tag, finalDecoration, slots)
      }
    },
  })

  applyDisplayName(Component, options.name)
  if (typeof defaultTag === 'string') {
    Object.assign(Component, { [COMPONENT_DEFAULT_TAG]: defaultTag })
  }

  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>
  >
}
