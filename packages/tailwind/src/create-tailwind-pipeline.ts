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

      if (process.env.NODE_ENV !== 'production') warnReservedLayoutLiterals(tokens)

      const state = new LayoutState(mode)
      const filtered = tokens.filter((token) => evaluator.evaluate(token, state))
      const built = builder.build(filtered)

      // No display class for 'none'. For flex/grid, prepend the mode unless a
      // surviving layout token already provides it.
      if (mode === 'none') return built
      return filtered.some((t) => t.kind === 'layout') ? built : cn(mode, built)
    },
  }
}
