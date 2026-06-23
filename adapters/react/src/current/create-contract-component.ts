import type { FilterPredicate } from '@praxis-kit/adapter-utils'
import { buildEngines, resolveAdapterCommonOptions } from '@praxis-kit/adapter-utils'
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
import { AriaPolicyEngine } from '@praxis-kit/core/contract'
import { COMPONENT_DEFAULT_TAG } from '@praxis-kit/shared/guards/children'
import type { ReactElement, ReactNode, Ref } from 'react'
import type { PolymorphicComponent, ReactFactoryOptions, UnknownProps } from '../shared'
import { applyDisplayName } from '../shared'
import { normalizeChildren } from './normalize-children'

import type { NodeDecoration } from '@pk2/core'
import { applyAttributes } from '@pk2/core'
import type { NodeId } from '@pk2/foundation'
import { extractDecoration } from '@pk2/react'

import {
  applyAria,
  applyFilterProps,
  applyRef,
  buildDefinition,
  buildVariantConfig,
  flattenClassName,
  joinClasses,
  renderAsChild,
  renderNormally,
  renderWithCallback,
  resolveClasses,
  type CompoundRecord,
  type Defaults,
  type PresetRecord,
  type RenderCallback,
  type VariantRecord,
} from './helpers'

declare const process: { env: { NODE_ENV: string } }

export function createContractComponent<
  TDefault extends ElementType,
  Props extends UnknownProps = EmptyRecord,
  Variants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends ClassPluginFactory<AnyRecord> | undefined =
    | ClassPluginFactory<AnyRecord>
    | undefined,
  TAllowed extends ElementType = ElementType,
>(options: ReactFactoryOptions<TDefault, Props, Variants, TPreset, TPlugin, TAllowed>) {
  const resolved = resolveAdapterCommonOptions(options)
  const displayName = resolved.name
  const defaultTag = (options.tag as string | undefined) ?? 'div'

  const definition = buildDefinition(displayName, defaultTag)
  const variantKeys = new Set(Object.keys(options.styling?.variants ?? {}))
  const domDefaults = options.defaults as Record<string, unknown> | undefined
  const variantDefaults = (options.styling?.defaults ?? {}) as Defaults
  const variantConfig = buildVariantConfig(
    options.styling?.variants as VariantRecord | undefined,
    options.styling?.presets as PresetRecord | undefined,
    variantDefaults,
  )
  const base =
    options.styling?.base !== undefined ? flattenClassName(options.styling.base) : undefined
  const compounds = options.styling?.compounds as ReadonlyArray<CompoundRecord> | undefined
  const filterFn = options.filterProps as FilterPredicate | undefined

  const { childrenEvaluator } = buildEngines(
    resolved.strict,
    options.enforcement?.children,
    displayName,
  )
  const ariaEngine =
    options.enforcement !== undefined ? new AriaPolicyEngine(resolved.strict) : undefined

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

    const allOwnProps =
      domDefaults !== undefined
        ? { ...domDefaults, ...ownProps }
        : (ownProps as Record<string, unknown>)
    const rootDec = extractDecoration(allOwnProps, variantKeys)
    const decoration = applyAria(
      Object.keys(rootDec).length > 0 ? { root: rootDec } : {},
      tag,
      ariaEngine,
    )

    if (process.env.NODE_ENV !== 'production' && childrenEvaluator !== undefined) {
      childrenEvaluator.evaluate(normalizeChildren(children))
    }

    const recipeName = typeof recipe === 'string' ? recipe : undefined
    const { variantClasses, compoundClasses } = resolveClasses(
      decoration,
      variantConfig,
      variantDefaults,
      recipeName,
      compounds,
    )

    const className = joinClasses(base, ...variantClasses, ...compoundClasses, callerClassName)

    if (typeof render === 'function')
      return renderWithCallback(render as RenderCallback, className, ref)

    if (asChild === true) {
      if (typeof as === 'string')
        throw new Error(`${displayName}: cannot use both 'as' and 'asChild' on the same element`)
      return renderAsChild(children, className, ref)
    }

    let finalDecoration: Record<NodeId, NodeDecoration> = className
      ? applyAttributes('root', { className }, decoration, variantKeys)
      : decoration

    finalDecoration = applyFilterProps(finalDecoration, filterFn, variantKeys)
    finalDecoration = applyRef(finalDecoration, ref)

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
