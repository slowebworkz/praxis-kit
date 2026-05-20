import { cn, createClassPipeline } from '@polymorphic-ui/core'
import type {
  ClassPipelineOptions,
  ClassPlugin,
  OwnedPropKeys,
  VariantMap,
} from '@polymorphic-ui/core'

import { ClassBuilder } from './class-builder'
import { ClassClassifier } from './class-classifier'
import { defaultDependencyRules } from './dependency-rules'
import { DependencyEvaluator } from './dependency-evaluator'
import { LayoutState } from './layout-state'

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

function resolveLayout(props: Record<string, unknown>): 'flex' | 'grid' | undefined {
  if (props.flex && props.grid) {
    console.warn(
      '[createTailwindPipeline] Cannot use both "flex" and "grid" simultaneously; "flex" takes precedence.',
    )
  }
  return props.flex ? 'flex' : props.grid ? 'grid' : undefined
}

export function createTailwindPipeline<V extends VariantMap = VariantMap>(
  options: ClassPipelineOptions<V>,
): ClassPlugin<LayoutProps> {
  const pipeline = createClassPipeline(options)

  return {
    ownedKeys: LAYOUT_OWNED_KEYS,

    pipeline(tag, props, className, variantKey) {
      const layout = resolveLayout(props)

      const raw = pipeline(tag, props, className, variantKey)

      if (!layout) return raw

      const tokens = raw.split(/\s+/).filter(Boolean).map(classifier.classify)

      const filtered = tokens.filter((token) =>
        evaluator.evaluate(token, new LayoutState(tokens, layout)),
      )

      return filtered.some((t) => t.kind === 'layout')
        ? builder.build(filtered)
        : cn(layout, builder.build(filtered))
    },
  }
}
