import type {
  AnyRecord,
  ClassPipelineFn,
  IntrinsicProps,
  ResolveInput,
  ResolveOutput,
  ResolverOptions,
} from '../types'
import { mergeProps } from '../utils'
import { AriaPolicyEngine } from '../validator'
import { resolveTag } from './resolve-tag'

export function createResolverPipeline<
  Props extends AnyRecord,
  TSlot extends string = string,
  Children = unknown,
>(
  resolved: ResolverOptions,
  classPipeline: ClassPipelineFn,
): (input: ResolveInput<Props, TSlot, Children>) => ResolveOutput<Props, Children> {
  const engine = new AriaPolicyEngine(resolved.strict)

  return function resolve(input) {
    const tag = resolveTag(resolved.defaultTag, input.as)
    const merged = mergeProps(resolved.defaultProps, input.props) as Props
    const { props } = engine.validate(tag, merged as IntrinsicProps)
    const className = classPipeline(tag, props as Props, input.className, input.variantKey)

    return {
      tag,
      props: props as Props,
      className,
      ...(input.children !== undefined && { children: input.children as Children }),
    }
  }
}
