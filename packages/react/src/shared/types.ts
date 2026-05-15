import type { AnyRecord, ClassName, ElementType, StrictMode } from '@polymorphic-ui/core'

export interface AnyRuntimeOptions {
  displayName?: string
  strict: StrictMode
  variantKeys: ReadonlySet<string>
}

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
