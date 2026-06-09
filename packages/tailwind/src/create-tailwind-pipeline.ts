import { cn, createClassPipeline } from '@praxis-kit/core'
import type {
  AnyRecord,
  ClassPipelineOptions,
  ClassPlugin,
  StrictMode,
  VariantMap,
  VariantValue,
} from '@praxis-kit/core'

import { ClassBuilder } from './class-builder'
import { ClassClassifier } from './class-classifier'
import { defaultDependencyRules } from './dependency-rules'
import { DependencyEvaluator } from './dependency-evaluator'
import { LayoutState } from './layout-state'
import { LAYOUT_OWNED_KEYS } from './layout-keys'
import type { ClassifiedToken } from './types/classified-token'
import type { LayoutMode, LayoutProps } from './types/layout'
import type { CompoundVariant, VariantSelection } from './types/variant-config'

declare const process: { env: { NODE_ENV: string } }

// Batched async-warn implementation — mirrors StrictBase.scheduleAsyncWarn.
// All messages queued in one synchronous pass flush in a single microtask;
// duplicates within the same tick are suppressed.
const pendingAsyncWarns = new Set<string>()
let asyncWarnScheduled = false

function flushAsyncWarns(): void {
  asyncWarnScheduled = false
  const messages = [...pendingAsyncWarns]
  pendingAsyncWarns.clear()
  for (const msg of messages) {
    console.warn(msg)
  }
}

function pipelineWarn(strict: StrictMode, message: string): void {
  if (!strict) return
  if (strict === 'async-warn') {
    if (pendingAsyncWarns.has(message)) return
    pendingAsyncWarns.add(message)
    if (!asyncWarnScheduled) {
      asyncWarnScheduled = true
      queueMicrotask(flushAsyncWarns)
    }
    return
  }
  console.warn(message)
}

const classifier = new ClassClassifier()
const evaluator = new DependencyEvaluator(defaultDependencyRules)
const builder = new ClassBuilder()

function normalizeVariantValue(value: VariantValue): string {
  if (typeof value === 'string') return value
  return value.join(' ')
}

function resolveLayout(props: LayoutProps & AnyRecord): LayoutMode {
  if (process.env.NODE_ENV !== 'production' && props.flex && props.grid) {
    // Not gated on strict — this is a misconfiguration at the call site, not a variant contract violation.
    console.warn(
      '[createTailwindPipeline] Cannot use both "flex" and "grid" simultaneously; "flex" takes precedence.',
    )
  }
  return props.flex ? 'flex' : props.grid ? 'grid' : 'none'
}

function warnReservedLayoutLiterals(strict: StrictMode, tokens: ClassifiedToken[]): void {
  if (!strict) return
  const reserved: string[] = []
  for (const token of tokens) {
    if (token.kind === 'layout') reserved.push(token.raw)
  }
  if (reserved.length === 0) return

  pipelineWarn(
    strict,
    `[createTailwindPipeline] Reserved layout class(es) ${reserved
      .map((r) => `"${r}"`)
      .join(', ')} found in resolved classes. ` +
      'The display mode is controlled by the "flex"/"grid" props, not by class strings.',
  )
}

const EMPTY_SET: ReadonlySet<string> = new Set()

function getVariantConfig<V extends VariantMap>(
  options: ClassPipelineOptions<V>,
): VariantMap | undefined {
  return options.variants
}

function getCompoundVariants<V extends VariantMap>(
  options: ClassPipelineOptions<V>,
): readonly CompoundVariant[] {
  return (options.compoundVariants ?? []) as readonly CompoundVariant[]
}

function classifyTokens(className: string): ClassifiedToken[] {
  return className.split(/\s+/).filter(Boolean).map(classifier.classify)
}

function compoundDimensions(compounds: readonly CompoundVariant[]): ReadonlySet<string> {
  if (compounds.length === 0) return EMPTY_SET
  const dims = new Set<string>()
  for (const compound of compounds) {
    for (const key in compound) {
      if (key !== 'class') dims.add(key)
    }
  }
  return dims
}

function getDefaultVariants<V extends VariantMap>(
  options: ClassPipelineOptions<V>,
): AnyRecord | undefined {
  return options.defaultVariants as AnyRecord | undefined
}

function resolveActiveSelection<V extends VariantMap>(
  options: ClassPipelineOptions<V>,
  variants: VariantMap,
  props: AnyRecord,
  variantKey: string | undefined,
): VariantSelection {
  const preset = variantKey ? options.presetMap?.[variantKey] : undefined
  const defaults = getDefaultVariants(options)

  const selection: VariantSelection = {}
  for (const dim in variants) {
    const value = props[dim] ?? preset?.[dim] ?? defaults?.[dim]
    if (value !== undefined && value !== null) selection[dim] = String(value)
  }
  return selection
}

function warnDeadVariants<V extends VariantMap>(
  strict: StrictMode,
  options: ClassPipelineOptions<V>,
  compoundDims: ReadonlySet<string>,
  props: AnyRecord,
  variantKey: string | undefined,
  state: LayoutState,
): void {
  if (!strict) return
  const variants = getVariantConfig(options)
  if (!variants) return

  const selection = resolveActiveSelection(options, variants, props, variantKey)
  for (const dim in selection) {
    if (compoundDims.has(dim)) continue

    const value = selection[dim]!
    const raw = variants[dim]?.[value]
    if (raw == null) continue

    const classStr = normalizeVariantValue(raw)
    const tokens = classifyTokens(classStr)

    if (tokens.length === 0) continue

    if (tokens.every((t) => !evaluator.evaluate(t, state))) {
      pipelineWarn(
        strict,
        `[createTailwindPipeline] Variant "${dim}=${value}" contributes only classes stripped under ` +
          `layout mode "${state.mode}" ("${classStr}") — it produces nothing in this mode.`,
      )
    }
  }
}

/**
 * Layout-aware class pipeline for Tailwind CSS utility class strings.
 *
 * This is a `ClassPluginFactory` — the runtime calls it with the component's
 * resolved pipeline options and strict mode. Do NOT call it yourself; pass the
 * function reference as `styling.plugin` and let the runtime invoke it.
 *
 * @example
 * ```ts
 * // CORRECT — pass the reference; the runtime calls it
 * createContractComponent({
 *   tag: 'div',
 *   styling: {
 *     base: 'items-center',
 *     plugin: createTailwindPipeline,
 *   },
 * })
 *
 * // WRONG — calling it manually produces a ClassPlugin where a ClassPluginFactory is expected
 * createContractComponent({
 *   tag: 'div',
 *   styling: {
 *     plugin: createTailwindPipeline({ base: 'items-center' }, false),
 *   },
 * })
 * ```
 *
 * With the plugin active, pass `flex` or `grid` as boolean props to control
 * the display mode. The pipeline injects the display class and strips
 * conflicting layout utilities (e.g. `grid-*` classes are removed in flex
 * mode).
 */
export function createTailwindPipeline<V extends VariantMap = VariantMap>(
  options: ClassPipelineOptions<V>,
  strict: StrictMode,
): ClassPlugin<LayoutProps> {
  const pipeline = createClassPipeline(options)
  const compoundDims = compoundDimensions(getCompoundVariants(options))

  return {
    ownedKeys: LAYOUT_OWNED_KEYS,

    pipeline(tag, props, className, variantKey) {
      const mode = resolveLayout(props)
      const raw = pipeline(tag, props, className, variantKey)
      const tokens = classifyTokens(raw)
      const state = new LayoutState(mode)

      if (process.env.NODE_ENV !== 'production') {
        warnReservedLayoutLiterals(strict, tokens)
        warnDeadVariants(strict, options, compoundDims, props, variantKey, state)
      }

      const filtered = tokens.filter((token) => evaluator.evaluate(token, state))
      const built = builder.build(filtered)

      if (mode === 'none') return built
      return filtered.some((t) => t.kind === 'layout') ? built : cn(mode, built)
    },
  }
}

/** Clears pending async-warn messages. Exposed for test isolation only. */
export function _resetPipelineWarns(): void {
  pendingAsyncWarns.clear()
  asyncWarnScheduled = false
}
