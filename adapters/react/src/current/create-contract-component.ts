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
import { cloneElement } from 'react'
import type { ReactElement, Ref } from 'react'
import { buildEngines, resolveAdapterCommonOptions } from '@praxis-kit/adapter-utils'
import { COMPONENT_DEFAULT_TAG } from '@praxis-kit/shared/guards/children'
import { applyDisplayName } from '../shared'
import type { UnknownProps, PolymorphicComponent, ReactFactoryOptions } from '../shared'
import { normalizeChildren } from './normalize-children'

import type { NodeId } from '@pk2/foundation'
import type { ComponentDefinition, NodeDecoration, NodeInput } from '@pk2/core'
import {
  applyAttributes,
  buildRenderContext,
  buildTreeContext,
  getActiveProps,
  renderComponent,
} from '@pk2/core'
import { extractDecoration, reactBackend } from '@pk2/react'
import { createVariantPass } from '@pk2/style'
import type { VariantConfig } from '@pk2/style'

declare const process: { env: { NODE_ENV: string } }

function buildDefinition(name: string, tag: string): ComponentDefinition {
  return { identity: { id: name, name, tag }, capabilities: {}, metadata: {}, diagnostics: [] }
}

function buildVariantConfig(
  variants: Record<string, Record<string, string | string[]>> | undefined,
  presets: Record<string, unknown> | undefined,
): VariantConfig {
  const flat: Record<string, Record<string, string>> = {}
  for (const [key, valueMap] of Object.entries(variants ?? {})) {
    const inner: Record<string, string> = {}
    for (const [val, cls] of Object.entries(valueMap)) {
      inner[val] = Array.isArray(cls) ? cls.join(' ') : (cls as string)
    }
    flat[key] = inner
  }
  return {
    variants: flat,
    ...(presets !== undefined && Object.keys(presets).length > 0
      ? { presets: presets as Record<string, Record<string, string>> }
      : {}),
  }
}

function resolveCompounds(
  active: Record<string, unknown>,
  compounds:
    | ReadonlyArray<Record<string, string | string[]> & { class: string | string[] }>
    | undefined,
): string[] {
  if (compounds === undefined || compounds.length === 0) return []
  const out: string[] = []
  for (const compound of compounds) {
    const { class: cls, ...conditions } = compound
    const matches = Object.entries(conditions).every(([k, v]) => {
      const a = active[k]
      return Array.isArray(v) ? v.includes(a as string) : a === v
    })
    if (matches) out.push(Array.isArray(cls) ? cls.join(' ') : cls)
  }
  return out
}

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

  // Synchronous definition — async compileComponent is Phase 20 (enforcement passes)
  const definition = buildDefinition(displayName, defaultTag)

  const variantKeys = new Set(Object.keys(options.styling?.variants ?? {}))
  const variantConfig = buildVariantConfig(
    options.styling?.variants as Record<string, Record<string, string | string[]>> | undefined,
    options.styling?.presets as Record<string, unknown> | undefined,
  )
  const defaults = (options.styling?.defaults ?? {}) as Record<string, string>
  const base = options.styling?.base
  const compounds = options.styling?.compounds as
    | ReadonlyArray<Record<string, string | string[]> & { class: string | string[] }>
    | undefined
  const filterFn = options.filterProps

  const { childrenEvaluator } = buildEngines(
    resolved.strict,
    options.enforcement?.children,
    displayName,
  )
  // Active only when enforcement is explicitly configured; absent = no ARIA engine at all
  const ariaEngine =
    options.enforcement !== undefined ? new AriaPolicyEngine(resolved.strict) : undefined

  function Component({ ref, ...props }: UnknownProps & { ref?: Ref<unknown> }): ReactElement {
    const {
      as,
      asChild: _asChild, // TODO Phase 20: asChild via Slot
      render: _render, // TODO Phase 20: render-prop support
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

    const decoration: Record<NodeId, NodeDecoration> = {}
    const rootDec = extractDecoration(ownProps as Record<string, unknown>, variantKeys)
    if (Object.keys(rootDec).length > 0) decoration['root'] = rootDec

    if (ariaEngine !== undefined) {
      const dec = decoration['root']
      if (dec !== undefined && dec.attributes !== undefined) {
        const result = ariaEngine.validate(tag, dec.attributes as Record<string, unknown>)
        const cleaned = result.props as typeof dec.attributes
        const { attributes: _a, ...rest } = dec
        decoration['root'] =
          Object.keys(cleaned).length > 0 ? { ...rest, attributes: cleaned } : rest
      }
    }

    if (process.env.NODE_ENV !== 'production' && childrenEvaluator !== undefined) {
      childrenEvaluator.evaluate(normalizeChildren(children))
    }

    // children: [] — raw children re-injected via cloneElement to preserve text nodes
    const root: NodeInput = { kind: 'native', tag, id: 'root', children: [] }
    const treeCtx = buildTreeContext(root)

    const active = getActiveProps('root', decoration)
    const activeWithDefaults: Record<string, unknown> = { ...defaults, ...active }
    if (typeof recipe === 'string') activeWithDefaults['preset'] = recipe

    const pass = createVariantPass(activeWithDefaults, variantConfig)
    const passResult = pass.execute({ classes: [] }) as { context: { classes: string[] } }
    const variantClasses = passResult.context.classes
    const compoundClasses = resolveCompounds(activeWithDefaults, compounds)

    const className = [base, ...variantClasses, ...compoundClasses, callerClassName]
      .filter(Boolean)
      .join(' ')

    let finalDecoration = className
      ? applyAttributes('root', { className }, decoration, variantKeys)
      : decoration

    // filterFn strips custom props from DOM attributes; variant keys are already in
    // dec.variants (not attributes) so they are never spread to the DOM regardless
    if (filterFn !== undefined) {
      const dec = finalDecoration['root']
      if (dec?.attributes !== undefined) {
        const kept = Object.fromEntries(
          Object.entries(dec.attributes).filter(([k]) => !filterFn(k, variantKeys)),
        )
        const { attributes: _a, ...rest } = dec
        finalDecoration = {
          ...finalDecoration,
          root: Object.keys(kept).length > 0 ? { ...rest, attributes: kept } : rest,
        }
      }
    }

    if (ref !== undefined) {
      const existing = finalDecoration['root'] ?? {}
      finalDecoration = { ...finalDecoration, root: { ...existing, ref } }
    }

    const rendered = renderComponent(
      definition,
      treeCtx,
      buildRenderContext(finalDecoration),
      reactBackend,
    )
    return children !== undefined ? cloneElement(rendered, {}, children as ReactElement) : rendered
  }

  applyDisplayName(Component, options.name)
  if (typeof defaultTag === 'string') {
    Object.assign(Component, { [COMPONENT_DEFAULT_TAG]: defaultTag })
  }

  return Component as unknown as PolymorphicComponent<
    PolymorphicGenerics<TDefault, Props & ExtractPluginProps<TPlugin>, Variants, TPreset, TAllowed>
  >
}
