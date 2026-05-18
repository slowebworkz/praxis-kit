import { createPolymorphic, AriaPolicyEngine, ChildrenEvaluator } from '@polymorphic-ui/core'
import type {
  ChildRuleInput,
  ElementType,
  StrictMode,
  VariantMap,
  VariantProps,
} from '@polymorphic-ui/core'
import type { ReactElement } from 'react'
import { SlotValidator } from './slot/slot-validator'
import type { ReactFactoryOptions } from './react-options'
import { composeFilter } from './compose-filter'
import type { UnknownProps, SlotComponent, TypedRuntime, FilterPredicate } from './types'

/* -------------------------------------------------------------------------------------------------
 * Layer 1 — Normalize options
 * -----------------------------------------------------------------------------------------------*/

type NormalizedOptions<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
> = ReactFactoryOptions<TDefault, Props, Variants, TPreset> & {
  readonly slotComponent: SlotComponent
  readonly strict: Exclude<
    ReactFactoryOptions<TDefault, Props, Variants, TPreset>['strict'],
    undefined
  >
  readonly displayName: string
}

function normalizeOptions<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
>(
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset>,
  defaultSlot: SlotComponent,
): NormalizedOptions<TDefault, Props, Variants, TPreset> {
  return {
    ...options,
    slotComponent: options.slotComponent ?? defaultSlot,
    strict: options.strict ?? 'throw',
    displayName: options.displayName ?? 'PolymorphicComponent',
  }
}

/* -------------------------------------------------------------------------------------------------
 * Layer 2 — Build core runtime
 * -----------------------------------------------------------------------------------------------*/

function createTypedRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
>(
  options: NormalizedOptions<TDefault, Props, Variants, TPreset>,
): TypedRuntime<TDefault, Props, Variants, TPreset> {
  return createPolymorphic(options)
}

function buildCoreRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
>(normalized: NormalizedOptions<TDefault, Props, Variants, TPreset>) {
  const runtime = createTypedRuntime(normalized)
  const ownedKeys = runtime.classPlugin?.ownedKeys
  return { runtime, ownedKeys }
}

/* -------------------------------------------------------------------------------------------------
 * Layer 3 — Build validators
 * -----------------------------------------------------------------------------------------------*/

function buildValidators(name: string, strict: StrictMode, childRules?: readonly ChildRuleInput[]) {
  const slotValidator = new SlotValidator(name, strict)
  const ariaEngine = new AriaPolicyEngine(strict)
  const childrenEvaluator = childRules?.length
    ? new ChildrenEvaluator(childRules, strict, name)
    : undefined
  return { slotValidator, ariaEngine, childrenEvaluator }
}

/* -------------------------------------------------------------------------------------------------
 * Public entry point
 * -----------------------------------------------------------------------------------------------*/

export interface BuiltRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
> {
  runtime: TypedRuntime<TDefault, Props, Variants, TPreset>
  slotComponent: SlotComponent
  normalizeChildren: (children: unknown) => ReactElement[]
  slotValidator: SlotValidator
  ariaEngine: AriaPolicyEngine
  filterProps: FilterPredicate
  childrenEvaluator?: ChildrenEvaluator
}

export function buildRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
>(
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset>,
  defaultSlot: SlotComponent,
  normalizeChildren: (children: unknown) => ReactElement[],
): BuiltRuntime<TDefault, Props, Variants, TPreset> {
  const normalized = normalizeOptions(options, defaultSlot)
  const { runtime, ownedKeys } = buildCoreRuntime(normalized)
  const { slotValidator, ariaEngine, childrenEvaluator } = buildValidators(
    normalized.displayName,
    normalized.strict,
    normalized.childRules,
  )
  const filterProps = composeFilter(ownedKeys, normalized.filterProps)

  return {
    runtime,
    slotComponent: normalized.slotComponent,
    normalizeChildren,
    slotValidator,
    ariaEngine,
    filterProps,
    ...(childrenEvaluator !== undefined && { childrenEvaluator }),
  }
}
