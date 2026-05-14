import type { AnyRecord, ClassPipelineFn, ElementType, ResolveInput, ResolveOutput } from '../types'
import { mergeProps } from '../utils'
import { resolveTag } from './resolve-tag'

type ResolvedOptions = {
  defaultTag: unknown
  defaultProps?: AnyRecord
}

export function createResolverPipeline<Props extends AnyRecord>(
  resolved: ResolvedOptions,
  classPipeline: ClassPipelineFn,
): (input: ResolveInput<Props>) => ResolveOutput<Props> {
  return function resolve(input) {
    const tag = resolveTag(resolved.defaultTag, input.as) as ElementType
    const props = mergeProps(resolved.defaultProps, input.props) as Props
    const className = classPipeline(tag, props, input.className, input.variantKey)

    return { tag, props, className, children: input.children }
  }
}
