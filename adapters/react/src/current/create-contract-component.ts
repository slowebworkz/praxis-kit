import type { FilterPredicate } from '@praxis-kit/adapter-utils'
import {
  applyPropNormalizers,
  buildEngines,
  resolveAdapterCommonOptions,
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
import type { ReactElement, ReactNode, Ref } from 'react'
import type { PolymorphicComponent, ReactFactoryOptions, UnknownProps } from '../shared'
import { applyDisplayName } from '../shared'
import { makeRenderAsChild, SlotValidator } from '../shared/slot'
import { cloneSlotChild } from './slot/cloneSlotChild'
import { normalizeChildren } from './normalize-children'

import type { NodeDecoration } from '@praxis-kit/runtime'
import { applyAttributes } from '@praxis-kit/runtime'
import type { NodeId } from '@praxis-kit/pipeline'
import { extractDecoration } from '../backend/extract-decoration'

import type {
  CompoundRecord,
  Defaults,
  PresetRecord,
  RenderCallback,
  StylePipeline,
  VariantRecord,
} from './helpers'
import {
  applyAria,
  applyFilterProps,
  applyRef,
  buildDefinition,
  buildStylePipeline,
  flattenClassName,
  joinClasses,
  renderNormally,
  renderWithCallback,
} from './helpers'

declare const process: { env: { NODE_ENV: string } }

const EMPTY_SET: ReadonlySet<string> = new Set()

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin, TAllowed>) {
  const resolved = resolveAdapterCommonOptions(options)
  const displayName = resolved.name
  const defaultTag = (options.tag as string | undefined) ?? 'div'

  const artifact = options.artifact
  const definition = artifact?.definition ?? buildDefinition(displayName, defaultTag)
  const variantKeys = new Set(Object.keys(options.styling?.variants ?? {}))
  const domDefaults = options.defaults as AnyRecord | undefined
  const stylePipeline: StylePipeline | undefined = buildStylePipeline(
    options.styling?.variants as VariantRecord | undefined,
    options.styling?.presets as PresetRecord | undefined,
    (options.styling?.defaults ?? {}) as Defaults,
    options.styling?.compounds as ReadonlyArray<CompoundRecord> | undefined,
    artifact?.precomputed?.variantLookup,
  )
  const base =
    options.styling?.base !== undefined ? flattenClassName(options.styling.base) : undefined
  const filterFn = options.filterProps as FilterPredicate | undefined
  const allowedAs = options.enforcement?.allowedAs as readonly ElementType[] | undefined
  const normalizeFn = options.normalize as ((props: AnyRecord) => AnyRecord) | undefined
  const enforcementNormalizers = options.enforcement?.props as readonly PropNormalizer[] | undefined

  // Wire class plugin: call the factory once at creation time
  const classPlugin: AnyClassPlugin =
    options.styling?.plugin !== undefined
      ? (options.styling.plugin as ClassPluginFactory<AnyRecord>)(
          options.styling as unknown as ClassPipelineOptions,
          resolved.diagnostics,
        )
      : undefined
  const pluginKeys: ReadonlySet<string> = classPlugin?.ownedKeys ?? EMPTY_SET

  // Children enforcement: explicit config takes priority; built-in HTML contracts checked per-render
  const { childrenEvaluator: explicitEvaluator } = buildEngines(
    resolved.diagnostics,
    options.enforcement?.children,
    displayName,
  )

  const ariaEngine =
    options.enforcement !== undefined ? new AriaPolicyEngine(resolved.diagnostics) : undefined

  const slotValidator = new SlotValidator(displayName, resolved.diagnostics, 'React element')
  const renderAsChild = makeRenderAsChild(cloneSlotChild)

  function Component({ ref, ...props }: UnknownProps & { ref?: Ref<unknown> }): ReactElement {
    const {
      as,
      asChild,
      render,
      children,
      className: callerClassName,
      recipe,
      ...ownProps
    } = props as {
      as?: string
      asChild?: boolean
      render?: unknown
      children?: ReactNode
      className?: string
      recipe?: string
      [key: string]: unknown
    }

    const tag = typeof as === 'string' ? as : defaultTag

    if (allowedAs !== undefined) enforceAllowedAs(tag, allowedAs, resolved.diagnostics, displayName)

    const rawBaseProps =
      domDefaults !== undefined ? { ...domDefaults, ...ownProps } : (ownProps as AnyRecord)
    const normalizedProps = applyPropNormalizers(tag, rawBaseProps, enforcementNormalizers)
    const baseProps = normalizeFn !== undefined ? normalizeFn(normalizedProps) : normalizedProps

    // Extract plugin-owned props before decoration so they don't leak to the DOM
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
        // Non-throw modes: warned and fell through — render normally as a fallback.
      } else {
        return renderAsChild(children, className, ref)
      }
    }

    let finalDecoration: Record<NodeId, NodeDecoration> = className
      ? applyAttributes('root', { className }, decoration, variantKeys)
      : decoration

    finalDecoration = applyFilterProps(finalDecoration, filterFn, variantKeys)
    finalDecoration = applyRef(finalDecoration, ref)

    if (typeof render === 'function')
      return renderWithCallback(
        render as RenderCallback,
        (finalDecoration['root']?.attributes ?? {}) as AnyRecord,
        className,
        ref,
      )

    return renderNormally(definition, tag, finalDecoration, children)
  }

  applyDisplayName(Component, options.name)
  if (typeof defaultTag === 'string') {
    Object.assign(Component, { [COMPONENT_DEFAULT_TAG]: defaultTag })
  }

  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset, TAllowed>
  >
}
