import type {
  AnyRecord,
  ChildRuleContext,
  ChildRuleMatch,
  ComponentReference,
  Rule,
} from '@praxis-kit/core'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { StringMap } from '@praxis-kit/primitive'

type ConformanceStyling = {
  base?: string
  variants?: StringMap<StringMap<string>>
  defaults?: StringMap<string>
  compounds?: ReadonlyArray<StringMap<string> & { class: string }>
  presets?: AnyRecord
}

type ConformanceChildRule = {
  name: string
  /**
   * Uses the same type-predicate contract required by the core enforcement API — not loosened
   * to a plain boolean-returning function. A real `match` passed through this conformance
   * config still needs to satisfy the actual core contract.
   */
  match: ChildRuleMatch<unknown>
  cardinality?: Rule<{ min?: number; max?: number }, ChildRuleContext>
}

type ConformanceEnforcement = {
  diagnostics?: Diagnostics
  children?: ReadonlyArray<ConformanceChildRule>
}

/**
 * Framework-neutral factory options used by the conformance suite.
 *
 * Intentionally exposes a simplified subset of the core factory configuration — same rationale
 * as `BareFactoryOptions`, which this type is cast through — so adapters can construct
 * equivalent components without reproducing the core `FactoryOptions` generic constraints.
 */
export type ConformanceFactoryOptions = {
  tag?: string
  name?: string
  styling?: ConformanceStyling
  /** Determines whether a prop should be forwarded to the rendered element. */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
  /** Child enforcement rules applied by the generated component. */
  enforcement?: ConformanceEnforcement
  /**
   * Component-specific prop transform. Runs *after* the built-in HTML prop
   * normalizers on every adapter, so it can observe and override their output.
   */
  normalize?: (props: AnyRecord) => AnyRecord
  /**
   * Declares that this component always renders composed `asChild` into another conformance
   * component. Typed as the real `ComponentReference` (not a loosened `unknown`) so this
   * assigns cleanly against `BareFactoryOptions`'s own `compose.with` field, which every
   * adapter's `createComponent(options as BareFactoryOptions)` cast is checked against.
   * `allProps` mirrors `ComposeOptions.allProps` — opt-in forwarding of this component's own raw
   * props onto `with`.
   */
  compose?: {
    with: ComponentReference
    allProps?: boolean
    defaults?: object
  }
}
