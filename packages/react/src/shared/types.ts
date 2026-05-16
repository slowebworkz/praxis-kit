import type {
  AnyRecord,
  ClassName,
  ElementType,
  ResolvedFactoryOptions,
} from '@polymorphic-ui/core'

export type AnyRuntimeOptions = Pick<
  ResolvedFactoryOptions,
  'displayName' | 'strict' | 'variantKeys' | 'childRules'
>

export interface AnyTagResolver {
  resolveTag(as?: ElementType): ElementType
}

export interface AnyPropsResolver {
  resolveProps(props: AnyRecord): AnyRecord
}

export interface AnyClassResolver {
  resolveClasses(
    tag: ElementType,
    props: AnyRecord,
    className?: ClassName,
    variantKey?: string,
  ): string
}

/** Widened runtime shape used by the shared render layer, avoiding the complex core generics. */
export interface AnyRuntime extends AnyTagResolver, AnyPropsResolver, AnyClassResolver {
  options: AnyRuntimeOptions
}
