import type {
  AriaPolicyEngine,
  ChildrenEvaluator,
  ClassName,
  ElementType,
  ResolvedFactoryOptions,
} from '@polymorphic-ui/core'
import type { Simplify } from 'type-fest'
import type { ComponentType, ReactElement, Ref } from 'react'
import type { SlotValidator } from './slot/slot-validator'

export type UnknownProps = Record<string, unknown>
export type SlotComponent = ComponentType<UnknownProps>
export type VariantKey = string

/* -------------------------------------------------------------------------------------------------
 * Runtime Contracts
 * -----------------------------------------------------------------------------------------------*/

export type RuntimeOptions = Readonly<
  Pick<ResolvedFactoryOptions, 'displayName' | 'strict' | 'variantKeys' | 'childRules'>
>

export type TagResolver = Readonly<{
  resolveTag(as?: ElementType): ElementType
}>

export type PropsResolver = Readonly<{
  resolveProps(props: UnknownProps): ResolvedProps
}>

export type ClassResolver = Readonly<{
  resolveClasses(
    tag: ElementType,
    props: ResolvedProps,
    className?: ClassName,
    variantKey?: VariantKey,
  ): string
}>

/** Widened runtime contract shared by the render layer, avoiding the complex core generics. */
export type Runtime = Readonly<
  TagResolver &
    PropsResolver &
    ClassResolver & {
      options: RuntimeOptions
    }
>

/* -------------------------------------------------------------------------------------------------
 * Polymorphic Props
 * -----------------------------------------------------------------------------------------------*/

export type AsProp<T extends ElementType = ElementType> = Readonly<{
  as?: T
}>

export type AsChildProp = Readonly<{
  asChild?: boolean
}>

export type PolymorphicPropsBase = Readonly<
  Simplify<
    {
      children?: unknown
      className?: ClassName
      variantKey?: VariantKey
    } & AsProp &
      AsChildProp
  >
>

export type KnownProps = Readonly<PolymorphicPropsBase & UnknownProps>

/* -------------------------------------------------------------------------------------------------
 * Render State
 * -----------------------------------------------------------------------------------------------*/

export type ResolvedProps = Readonly<UnknownProps>

export type RenderDirectives = Readonly<AsProp & AsChildProp>

export type ResolvedRenderState = Readonly<{
  tag: ElementType
  directives: RenderDirectives
  children?: unknown
  className: string
  props: ResolvedProps
}>

export type ResolvedSlotRender = Readonly<{
  child: ReactElement
}>

/* -------------------------------------------------------------------------------------------------
 * Filtering
 * -----------------------------------------------------------------------------------------------*/

export type FilterPredicate = (key: string, variantKeys: ReadonlySet<string>) => boolean

/* -------------------------------------------------------------------------------------------------
 * Render Input
 * -----------------------------------------------------------------------------------------------*/

export type NormalizeChildren = (children: unknown) => ReactElement[]

export type RenderInput<TProps extends KnownProps = KnownProps> = Readonly<{
  runtime: Runtime
  props: TProps
  ref: Ref<unknown> | null
  slotComponent: SlotComponent
  normalizeChildren: NormalizeChildren
  filterProps: FilterPredicate
  slotValidator: SlotValidator
  ariaEngine: AriaPolicyEngine
  childrenEvaluator?: ChildrenEvaluator
}>
