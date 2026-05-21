import type {
  AriaRule,
  ChildRuleInput,
  DefaultOf,
  ElementType,
  PolymorphicGenerics,
  PresetMap,
  PresetOf,
  PropsOf,
  StrictMode,
  VariantMap,
  VariantsOf,
} from '@polymorphic-ui/core'
import { AriaPolicyEngine, ChildrenEvaluator, createPolymorphic } from '@polymorphic-ui/core'
import type { ReactElement } from 'react'
import { composeFilter } from './compose-filter'
import type { ReactFactoryOptions } from './react-options'
import { SlotValidator } from './slot'
import type { BuiltRuntime, WithChildRules } from './types/built-runtime'
import type { NormalizedOptions } from './types/normalized-options'
import type { SlotComponent, UnknownProps } from './types'

/* -------------------------------------------------------------------------------------------------
 * Layer 1 — Normalize options
 * -----------------------------------------------------------------------------------------------*/

function normalizeOptions<G extends PolymorphicGenerics>(
  options: ReactFactoryOptions<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>,
  defaultSlot: SlotComponent,
): NormalizedOptions<G> {
  return {
    ...options,
    slotComponent: options.slotComponent ?? defaultSlot,
    strict: options.strict ?? 'throw',
    displayName: options.displayName ?? 'PolymorphicComponent',
  } as NormalizedOptions<G>
}

/* -------------------------------------------------------------------------------------------------
 * Layer 2 — Build core runtime
 * -----------------------------------------------------------------------------------------------*/

function buildCoreRuntime<G extends PolymorphicGenerics>(normalized: NormalizedOptions<G>) {
  const runtime = createPolymorphic(normalized)
  const ownedKeys = 'classPlugin' in runtime ? runtime.classPlugin.ownedKeys : undefined
  return { runtime, ownedKeys }
}

/* -------------------------------------------------------------------------------------------------
 * Layer 3 — Build validators
 * -----------------------------------------------------------------------------------------------*/

function buildValidators(
  name: string,
  strict: StrictMode,
  childRules?: readonly ChildRuleInput[],
  ariaRules?: readonly AriaRule[],
) {
  const slotValidator = new SlotValidator(name, strict)
  const ariaEngine = new AriaPolicyEngine(
    strict,
    ariaRules?.length ? { rules: ariaRules } : undefined,
  )
  const childrenEvaluator = childRules?.length
    ? new ChildrenEvaluator(childRules, strict, name)
    : undefined
  return { slotValidator, ariaEngine, childrenEvaluator }
}

/* -------------------------------------------------------------------------------------------------
 * Public entry point
 * -----------------------------------------------------------------------------------------------*/

export type { BuiltRuntime }

export function buildRuntime<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants>,
  TOptions extends WithChildRules,
>(
  options: ReactFactoryOptions<TDefault, Props, Variants, TPreset> & TOptions,
  defaultSlot: SlotComponent,
  normalizeChildren: (children: unknown) => ReactElement[],
): BuiltRuntime<PolymorphicGenerics<TDefault, Props, Variants, TPreset>, TOptions> {
  type G = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
  const normalized = normalizeOptions<G>(options, defaultSlot)
  const { runtime, ownedKeys } = buildCoreRuntime<G>(normalized)
  const { slotValidator, ariaEngine, childrenEvaluator } = buildValidators(
    normalized.displayName,
    normalized.strict,
    normalized.childRules,
    normalized.ariaRules,
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
  } as BuiltRuntime<G, TOptions>
}
