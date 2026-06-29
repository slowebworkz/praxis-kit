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
import { layoutKeys } from './layout-keys'
import { COMPOUND_META_KEYS, EMPTY_SET, LAYOUT_OWNED_KEYS } from './constants'
import type { ClassifiedToken } from './types/classified-token'
import type { LayoutKey, LayoutMode, LayoutProps, CompoundVariant, VariantSelection } from './types'
import { isString } from '@praxis-kit/shared'
import { iterate } from '@praxis-kit/primitive'
import { diagnosticsFromStrictMode } from '@praxis-kit/contract'
import { Diagnostics, DefaultPolicy, Severity } from '@praxis-kit/diagnostics'
import { TailwindDiagnostics } from './diagnostics'

declare const process: { env: { NODE_ENV: string } }
const DEV = process.env.NODE_ENV !== 'production'

// Used for the display-prop conflict warning, which fires regardless of strict —
// multiple display props is always a misconfiguration. Does not dedup: every
// render that triggers this warning should be visible.
const devDiagnostics = new Diagnostics(
  { report: (d) => console.warn(d.message) },
  new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
)

const classifier = new ClassClassifier()
const evaluator = new DependencyEvaluator(defaultDependencyRules)
const builder = new ClassBuilder()

function normalizeVariantValue(value: VariantValue): string {
  if (isString(value)) return value
  return value.join(' ')
}

function resolveLayout(diagnostics: Diagnostics, props: LayoutProps & AnyRecord): LayoutMode {
  const active: LayoutKey[] = []
  iterate.forEach(layoutKeys, (key) => {
    if (props[key]) active.push(key)
  })
  if (DEV && active.length > 1) {
    diagnostics.warn(TailwindDiagnostics.multipleDisplayProps(active))
  }
  return active[0] ?? 'none'
}

function warnReservedLayoutLiterals(diagnostics: Diagnostics, tokens: ClassifiedToken[]): void {
  const reserved: string[] = []
  iterate.forEach(tokens, (token) => {
    if (token.kind === 'layout') reserved.push(token.raw)
  })
  if (reserved.length === 0) return

  diagnostics.warn(TailwindDiagnostics.reservedLayoutLiteral(reserved))
}

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
  iterate.forEach(compounds, (compound) => {
    iterate.forEachKey(compound, (key) => {
      if (!COMPOUND_META_KEYS.has(key)) dims.add(key)
    })
  })
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
  recipe: string | undefined,
): VariantSelection {
  const preset = recipe ? options.recipeMap?.[recipe] : undefined
  const defaults = getDefaultVariants(options)

  const selection: VariantSelection = {}
  iterate.forEachKey(variants, (dim) => {
    const value = props[dim] ?? preset?.[dim] ?? defaults?.[dim]
    if (value !== undefined && value !== null) selection[dim] = String(value)
  })
  return selection
}

function warnDeadVariants<V extends VariantMap>(
  diagnostics: Diagnostics,
  options: ClassPipelineOptions<V>,
  compoundDims: ReadonlySet<string>,
  props: AnyRecord,
  recipe: string | undefined,
  state: LayoutState,
): void {
  const variants = getVariantConfig(options)
  if (!variants) return

  const selection = resolveActiveSelection(options, variants, props, recipe)
  iterate.forEachEntry(selection, (dim, value) => {
    if (compoundDims.has(dim)) return

    const raw = variants[dim]?.[value]
    if (raw == null) return

    const classStr = normalizeVariantValue(raw)
    const tokens = classifyTokens(classStr)

    if (tokens.length === 0) return

    if (tokens.every((t) => !evaluator.evaluate(t, state))) {
      diagnostics.warn(TailwindDiagnostics.deadVariantClass(dim, value, state.mode, classStr))
    }
  })
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
 * With the plugin active, pass any display prop (`flex`, `inline-flex`, `grid`,
 * `inline-grid`, `block`, `hidden`, etc.) as a boolean to control the display
 * mode. The pipeline injects the display class and strips conflicting utilities:
 * flex-family modes strip `grid-*`; grid-family modes strip `flex-*`; all other
 * display values (and no prop) strip both `flex-*` and `grid-*`.
 */
export function createTailwindPipeline<V extends VariantMap = VariantMap>(
  options: ClassPipelineOptions<V>,
  strict: StrictMode,
): ClassPlugin<LayoutProps> {
  const pipeline = createClassPipeline(options)
  const compoundDims = compoundDimensions(getCompoundVariants(options))
  const diagnostics = diagnosticsFromStrictMode(strict)

  return {
    ownedKeys: LAYOUT_OWNED_KEYS,

    pipeline(tag, props, className, recipe) {
      // devDiagnostics fires regardless of strict — conflict is always a misconfiguration.
      const mode = resolveLayout(devDiagnostics, props)
      const raw = pipeline(tag, props, className, recipe)
      const tokens = classifyTokens(raw)
      const state = new LayoutState(mode)

      if (DEV) {
        warnReservedLayoutLiterals(diagnostics, tokens)
        warnDeadVariants(diagnostics, options, compoundDims, props, recipe, state)
      }

      const filtered = tokens.filter((token) => evaluator.evaluate(token, state))
      const built = builder.build(filtered)

      if (mode === 'none') return built
      return filtered.some((t) => t.kind === 'layout' && t.value === mode) ? built : cn(mode, built)
    },
  }
}

/** No-op shim retained for test compatibility. Async state now lives per-pipeline. */
export function _resetPipelineWarns(): void {}
