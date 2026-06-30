import type { FilterPredicate } from '@praxis-kit/adapter-utils'
import {
  applyPropNormalizers,
  buildEngines,
  resolveAdapterCommonOptions,
  applyAria,
  applyFilterProps,
  applyRef,
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
  AnyRecord,
  ClassPlugin,
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
import { COMPONENT_DEFAULT_TAG } from '@praxis-kit/shared/guards/children'
import { forwardRef } from 'preact/compat'
import type { ForwardedRef } from 'preact/compat'
import type { NodeDecoration } from '@pk2/core'
import { applyAttributes } from '@pk2/core'
import type { NodeId } from '@pk2/foundation'
import { extractDecoration } from '@pk2/preact'
import { applyDisplayName } from './apply-display-name'
import { makeRenderAsChild, renderNormally } from './helpers'
import { normalizeChildren } from './normalize-children'
import { cloneSlotChild } from './slot/cloneSlotChild'
import { SlotValidator } from './slot/slot-validator'
import type { AnyVNode, UnknownProps } from './types'
import type { PolymorphicComponent } from './types/polymorphic-props'
import type { PreactFactoryOptions } from './preact-options'

declare const process: { env: { NODE_ENV: string } }

const EMPTY_SET: ReadonlySet<string> = new Set()

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends ClassPluginFactory<AnyRecord> | undefined =
    | ClassPluginFactory<AnyRecord>
    | undefined,
>(options: PreactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin>) {
  const resolved = resolveAdapterCommonOptions(options)
  const displayName = resolved.name
  const defaultTag = (options.tag as string | undefined) ?? 'div'

  const definition = buildDefinition(displayName, defaultTag)
  const variantKeys = new Set(Object.keys(options.styling?.variants ?? {}))
  const domDefaults = options.defaults as Record<string, unknown> | undefined
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
  const normalizeFn = options.normalize as
    | ((props: Record<string, unknown>) => Record<string, unknown>)
    | undefined
  const enforcementNormalizers = options.enforcement?.props as readonly PropNormalizer[] | undefined

  const classPlugin: ClassPlugin<AnyRecord> | undefined =
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

  const slotValidator = new SlotValidator(displayName, resolved.diagnostics)
  const renderAsChild = makeRenderAsChild(cloneSlotChild)

  const Component = forwardRef(function Component(
    props: UnknownProps,
    ref: ForwardedRef<unknown>,
  ): AnyVNode {
    const {
      as,
      asChild,
      children,
      className: callerClassName,
      recipe,
      ...ownProps
    } = props as {
      as?: string
      asChild?: boolean
      children?: unknown
      className?: string
      recipe?: string
      [key: string]: unknown
    }

    const tag = typeof as === 'string' ? as : defaultTag

    if (allowedAs !== undefined) enforceAllowedAs(tag, allowedAs, resolved.diagnostics, displayName)

    const rawBaseProps =
      domDefaults !== undefined
        ? { ...domDefaults, ...ownProps }
        : (ownProps as Record<string, unknown>)
    const normalizedProps = applyPropNormalizers(tag, rawBaseProps, enforcementNormalizers)
    const baseProps = normalizeFn !== undefined ? normalizeFn(normalizedProps) : normalizedProps

    const pluginProps: AnyRecord = {}
    const propsForExtraction: Record<string, unknown> =
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

    if (process.env.NODE_ENV !== 'production') {
      const childEval = explicitEvaluator ?? getHtmlChildrenEvaluator(tag)
      childEval?.evaluate(normalizeChildren(children))
    }

    const recipeName = typeof recipe === 'string' ? recipe : undefined
    const { variantClasses, compoundClasses } = stylePipeline
      ? stylePipeline.execute(decoration, recipeName)
      : { variantClasses: [], compoundClasses: [] }

    const rawClassName = joinClasses(base, ...variantClasses, ...compoundClasses, callerClassName)
    const className =
      classPlugin !== undefined
        ? classPlugin.pipeline(tag, pluginProps, rawClassName, recipeName)
        : rawClassName

    if (asChild === true) {
      if (typeof as === 'string') {
        slotValidator.assertExclusive()
      } else {
        return renderAsChild(children, className, ref ?? null)
      }
    }

    let finalDecoration: Record<NodeId, NodeDecoration> = className
      ? applyAttributes('root', { className }, decoration, variantKeys)
      : decoration

    finalDecoration = applyFilterProps(finalDecoration, filterFn, variantKeys)
    finalDecoration = applyRef(finalDecoration, ref ?? null)

    return renderNormally(definition, tag, finalDecoration, children)
  })

  applyDisplayName(Component, options.name)
  if (typeof defaultTag === 'string') {
    Object.assign(Component, { [COMPONENT_DEFAULT_TAG]: defaultTag })
  }

  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset>
  >
}
