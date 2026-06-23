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
import type { ReactElement, Ref } from 'react'
import type { PolymorphicComponent, ReactFactoryOptions, UnknownProps } from '../shared'
import { applyDisplayName } from '../shared'
import { normalizeChildren } from './normalize-children'

import type { NodeDecoration, NodeInput } from '@pk2/core'
import { applyAttributes, buildTreeContext, getActiveProps } from '@pk2/core'
import type { NodeId } from '@pk2/foundation'
import { extractDecoration } from '@pk2/react'
import { createVariantPass } from '@pk2/style'

import {
  applyAria,
  applyFilterProps,
  buildDefinition,
  buildVariantConfig,
  renderAsChild,
  renderNormally,
  renderWithCallback,
  resolveCompounds,
  type CompoundRecord,
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
  const variantDefaults = (options.styling?.defaults ?? {}) as Record<string, string>
  const variantConfig = buildVariantConfig(
    options.styling?.variants as VariantRecord | undefined,
    options.styling?.presets as PresetRecord | undefined,
    variantDefaults,
  )
  const base = options.styling?.base
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
      children?: unknown
      className?: string
      recipe?: string
      [key: string]: unknown
    }

    const tag = typeof as === 'string' ? as : defaultTag

    let decoration: Record<NodeId, NodeDecoration> = {}
    const allOwnProps =
      domDefaults !== undefined
        ? { ...domDefaults, ...ownProps }
        : (ownProps as Record<string, unknown>)
    const rootDec = extractDecoration(allOwnProps, variantKeys)
    if (Object.keys(rootDec).length > 0) decoration['root'] = rootDec

    decoration = applyAria(decoration, tag, ariaEngine)

    if (process.env.NODE_ENV !== 'production' && childrenEvaluator !== undefined) {
      childrenEvaluator.evaluate(normalizeChildren(children))
    }

    const root: NodeInput = { kind: 'native', tag, id: 'root', children: [] }
    const treeCtx = buildTreeContext(root)

    const active = getActiveProps('root', decoration)
    // Only explicitly-set props go into the pass; defaults live in variantConfig.defaults
    const activeForPass: AnyRecord = { ...active }
    if (typeof recipe === 'string') activeForPass['preset'] = recipe

    const result = createVariantPass(activeForPass, variantConfig).execute({
      classes: [],
    }) as {
      context?: { classes?: string[] }
    }
    const variantClasses = result.context?.classes ?? []
    // Compounds need the fully-resolved values: defaults < preset < explicit
    const presetVars: AnyRecord =
      typeof recipe === 'string'
        ? ((variantConfig.presets?.[recipe] as AnyRecord | undefined) ?? {})
        : {}
    const compoundClasses = resolveCompounds(
      { ...variantDefaults, ...presetVars, ...active },
      compounds,
    )

    const className = [base, ...variantClasses, ...compoundClasses, callerClassName]
      .filter(Boolean)
      .join(' ')

    if (typeof render === 'function')
      return renderWithCallback(render as RenderCallback, className, ref)

    if (asChild === true) {
      if (typeof as === 'string')
        throw new Error(`${displayName}: cannot use both 'as' and 'asChild' on the same element`)
      return renderAsChild(children, className, ref)
    }

    let finalDecoration = className
      ? applyAttributes('root', { className }, decoration, variantKeys)
      : decoration

    finalDecoration = applyFilterProps(finalDecoration, filterFn, variantKeys)

    if (ref !== undefined) {
      const existing = finalDecoration['root'] ?? {}
      finalDecoration = { ...finalDecoration, root: { ...existing, ref } }
    }

    return renderNormally(definition, treeCtx, finalDecoration, children)
  }

  applyDisplayName(Component, options.name)
  if (typeof defaultTag === 'string') {
    Object.assign(Component, { [COMPONENT_DEFAULT_TAG]: defaultTag })
  }

  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset, TAllowed>
  >
}
