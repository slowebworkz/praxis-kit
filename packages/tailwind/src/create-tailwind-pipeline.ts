import { cn, createClassPipeline } from '@praxis-ui/core'
import type {
  AnyRecord,
  ClassPipelineOptions,
  ClassPlugin,
  OwnedPropKeys,
  VariantMap,
} from '@praxis-ui/core'

import { ClassBuilder } from './class-builder'
import { ClassClassifier } from './class-classifier'
import { defaultDependencyRules } from './dependency-rules'
import { DependencyEvaluator } from './dependency-evaluator'
import { LayoutState } from './layout-state'
import type { ClassifiedToken } from './types/classified-token'
import type { LayoutMode } from './types/layout'

declare const process: { env: { NODE_ENV: string } }

const classifier = new ClassClassifier()
const evaluator = new DependencyEvaluator(defaultDependencyRules)
const builder = new ClassBuilder()

const LAYOUT_OWNED_KEYS: OwnedPropKeys = new Set(['flex', 'grid'])

/**
 * Mutually exclusive layout shorthand props.
 *
 * At most one key may be `true`. Passing both is a compile-time error; the
 * runtime also warns and lets `flex` take precedence for graceful degradation.
 */
export type LayoutProps =
  | { flex: true; grid?: never }
  | { grid: true; flex?: never }
  | { flex?: never; grid?: never }

// The display mode is owned by the props. Neither prop set is an explicit
// `'none'` mode (strips all layout-dependent classes), not a passthrough.
function resolveLayout(props: AnyRecord): LayoutMode {
  if (props.flex && props.grid) {
    console.warn(
      '[createTailwindPipeline] Cannot use both "flex" and "grid" simultaneously; "flex" takes precedence.',
    )
  }
  return props.flex ? 'flex' : props.grid ? 'grid' : 'none'
}

// `flex`/`grid` display literals are reserved — the pipeline is their only
// legitimate emitter (it prepends the display class from the prop). Any layout
// literal in the resolved input is an authoring mistake; surface it in dev.
function warnReservedLayoutLiterals(tokens: ClassifiedToken[]): void {
  const reserved = tokens.filter((t) => t.kind === 'layout').map((t) => t.raw)
  if (reserved.length > 0) {
    console.warn(
      `[createTailwindPipeline] Reserved layout class(es) ${reserved
        .map((r) => `"${r}"`)
        .join(', ')} found in resolved classes. ` +
        'The display mode is controlled by the "flex"/"grid" props, not by class strings.',
    )
  }
}

// Local shape for the variant config the plugin reconstructs from. Variant values
// are `string | string[]` (VariantValue); the maps are keyed by dimension then state.
type VariantConfig = Record<string, Record<string, string | string[]>>

// Reconstruct the active variant value per dimension, mirroring CVA's resolution
// order: explicit prop wins, then the active preset, then defaultVariants.
function resolveActiveSelection<V extends VariantMap>(
  options: ClassPipelineOptions<V>,
  props: AnyRecord,
  variantKey: string | undefined,
): Record<string, string> {
  const variants = options.variants as VariantConfig | undefined
  if (!variants) return {}
  const preset = variantKey ? options.presetMap?.[variantKey] : undefined
  const defaults = options.defaultVariants as Record<string, unknown> | undefined

  const selection: Record<string, string> = {}
  for (const dim in variants) {
    const value = props[dim] ?? preset?.[dim] ?? defaults?.[dim]
    // Boolean variant props map to the 'true'/'false' state keys (StringToBoolean).
    if (value !== undefined && value !== null) selection[dim] = String(value)
  }
  return selection
}

// Dimensions that participate in any compound variant. Their per-dimension
// class contribution can't be reasoned about in isolation — a compound may
// rescue them — so dead-variant analysis conservatively skips them to avoid
// false positives.
const EMPTY_SET: ReadonlySet<string> = new Set()

function compoundDimensions<V extends VariantMap>(
  options: ClassPipelineOptions<V>,
): ReadonlySet<string> {
  const compounds = options.compoundVariants as ReadonlyArray<Record<string, unknown>> | undefined
  if (!compounds || compounds.length === 0) return EMPTY_SET
  const dims = new Set<string>()
  for (const compound of compounds) {
    for (const key in compound) {
      if (key !== 'class') dims.add(key)
    }
  }
  return dims
}

// Case B — dead-variant detection. An active variant whose ENTIRE class
// contribution is stripped under the resolved mode is dead code: an exposed
// prop that produces nothing. Reconstruct each active variant's classes from
// `options.variants` and warn if all of them are stripped.
//
// Dimensions involved in a compound variant are skipped: the compound may
// contribute surviving classes for the active combination, so a per-dimension
// "all stripped" check would false-positive. Conservative — may miss a
// genuinely dead variant that shares a dimension with an unrelated compound.
function warnDeadVariants<V extends VariantMap>(
  options: ClassPipelineOptions<V>,
  props: AnyRecord,
  variantKey: string | undefined,
  state: LayoutState,
): void {
  const variants = options.variants as VariantConfig | undefined
  if (!variants) return

  const skip = compoundDimensions(options)
  const selection = resolveActiveSelection(options, props, variantKey)
  for (const dim in selection) {
    if (skip.has(dim)) continue
    const value = selection[dim]!
    const raw = variants[dim]?.[value]
    if (raw == null) continue
    const classStr = Array.isArray(raw) ? raw.join(' ') : raw
    const tokens = classStr.split(/\s+/).filter(Boolean).map(classifier.classify)
    if (tokens.length === 0) continue
    if (tokens.every((t) => !evaluator.evaluate(t, state))) {
      console.warn(
        `[createTailwindPipeline] Variant "${dim}=${value}" contributes only classes stripped under ` +
          `layout mode "${state.mode}" ("${classStr}") — it produces nothing in this mode.`,
      )
    }
  }
}

export function createTailwindPipeline<V extends VariantMap = VariantMap>(
  options: ClassPipelineOptions<V>,
): ClassPlugin<LayoutProps> {
  const pipeline = createClassPipeline(options)

  return {
    ownedKeys: LAYOUT_OWNED_KEYS,

    pipeline(tag, props, className, variantKey) {
      const mode = resolveLayout(props)
      const raw = pipeline(tag, props, className, variantKey)
      const tokens = raw.split(/\s+/).filter(Boolean).map(classifier.classify)
      const state = new LayoutState(mode)

      if (process.env.NODE_ENV !== 'production') {
        warnReservedLayoutLiterals(tokens)
        warnDeadVariants(options, props, variantKey, state)
      }

      const filtered = tokens.filter((token) => evaluator.evaluate(token, state))
      const built = builder.build(filtered)

      // No display class for 'none'. For flex/grid, prepend the mode unless a
      // surviving layout token already provides it.
      if (mode === 'none') return built
      return filtered.some((t) => t.kind === 'layout') ? built : cn(mode, built)
    },
  }
}
