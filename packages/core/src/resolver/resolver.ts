import { mergeProps, resolveTag } from '@praxis-kit/primitive'
import {
  AriaPolicyEngine,
  ContractDiagnostics,
  diagnosticsFromStrictMode,
} from '@praxis-kit/contract'
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
  if (!strict) return
  const component = displayName ?? String(tag)
  diagnosticsFromStrictMode(strict).error(
    ContractDiagnostics.allowedAsViolation(String(tag), allowedAs, component),
  )
}

export function createResolverPipeline<
  Props extends AnyRecord,
  TSlot extends string = string,
  Children = unknown,
>(
  resolved: ResolverOptions,
  classPipeline: ClassPipelineFn,
): (input: ResolveInput<Props, TSlot, Children>) => ResolveOutput<Props, Children> {
  const engine = new AriaPolicyEngine(diagnosticsFromStrictMode(resolved.strict ?? false))

  return function resolve(input) {
    const tag = resolveTag(resolved.defaultTag, input.as)
    if (resolved.allowedAs !== undefined && input.as !== undefined) {
      enforceAllowedAs(tag, resolved.allowedAs, resolved.strict, resolved.displayName)
    }
    const merged = mergeProps(resolved.defaultProps, input.props) as Props
    const { props } = engine.validate(tag, merged as IntrinsicProps)
    const className = classPipeline(tag, props as Props, input.className, input.recipe)

    return {
      tag,
      props: props as Props,
      className,
      ...(input.children !== undefined && { children: input.children as Children }),
    }
  }
}
