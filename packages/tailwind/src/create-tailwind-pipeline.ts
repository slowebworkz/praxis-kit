import { cn, createClassPipeline } from '@polymorphic-ui/core'
import type { ClassPipelineOptions, VariantMap } from '@polymorphic-ui/core'
import { ClassBuilder } from './class-builder'
import { ClassClassifier } from './class-classifier'
import { defaultDependencyRules } from './dependency-rules'
import { DependencyEvaluator } from './dependency-evaluator'
import { LayoutState } from './layout-state'
import type { LayoutKey } from './types/layout'

const classifier = new ClassClassifier()
const evaluator = new DependencyEvaluator(defaultDependencyRules)
const builder = new ClassBuilder()

export type TailwindClassPipelineFn = (
  tag: unknown,
  props: Record<string, unknown>,
  className?: string,
  variantKey?: string,
  layout?: LayoutKey,
) => string

export function createTailwindPipeline<TVariants extends VariantMap = VariantMap>(
  options: ClassPipelineOptions<TVariants>,
): TailwindClassPipelineFn {
  const base = createClassPipeline(options)

  return function resolveTailwindClasses(tag, props, className, variantKey, layout) {
    const raw = base(tag, props, className, variantKey)
    if (!layout) return raw

    const tokens = raw
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => classifier.classify(token))

    const state = new LayoutState(tokens, layout)
    const filtered = tokens.filter((t) => evaluator.evaluate(t, state))
    const built = builder.build(filtered)
    const layoutEmitted = filtered.some((t) => t.kind === 'layout')
    return layoutEmitted ? built : cn(layout, built)
  }
}
