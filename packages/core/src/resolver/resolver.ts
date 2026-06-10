import { mergeProps, resolveTag } from '@praxis-kit/primitive'
import { AriaPolicyEngine } from '@praxis-kit/contract'
import type {
  AnyRecord,
  ClassPipelineFn,
  ElementType,
  IntrinsicProps,
  ResolveInput,
  ResolveOutput,
  ResolverOptions,
  StrictMode,
} from '../types'

export function enforceAllowedAs(
  tag: ElementType,
  allowedAs: readonly ElementType[],
  strict: StrictMode | undefined,
  displayName?: string,
): void {
  if (allowedAs.includes(tag)) return
  const component = displayName ? `<${displayName}>` : 'component'
  const allowed = allowedAs.map((t) => `"${String(t)}"`).join(', ')
  const message = `${component}: "as" prop received "${String(tag)}" but only [${allowed}] are allowed.`
  if (strict === true || strict === 'throw') {
    throw new Error(message)
  }
  if (strict) {
    console.warn(message)
  }
}

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
    if (resolved.allowedAs !== undefined && input.as !== undefined) {
      enforceAllowedAs(tag, resolved.allowedAs, resolved.strict, resolved.displayName)
    }
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
