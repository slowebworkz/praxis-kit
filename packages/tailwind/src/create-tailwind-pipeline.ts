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

export type LayoutProps = {
  flex?: boolean
  grid?: boolean
}

function resolveLayout(props: Record<string, unknown>): 'flex' | 'grid' | undefined {
  return props.flex ? 'flex' : props.grid ? 'grid' : undefined
}

export function createTailwindPipeline<V extends VariantMap = VariantMap>(
  options: ClassPipelineOptions<V>,
): ClassPlugin {
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
