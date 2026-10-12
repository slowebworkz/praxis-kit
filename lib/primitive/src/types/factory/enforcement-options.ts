import type { ElementType } from '../primitives'
import type { AriaRule } from '../aria-rule'
import type { ChildRuleInput } from '../contracts'
import type { PropNormalizer } from './prop-normalizer'
import type { Diagnostics, DiagnosticsMode } from '@praxis-kit/diagnostics'

export type EnforcementOptions<TAllowed extends ElementType = ElementType> = {
  /**
   * Accepts a preset name (`'warn'`, `'throw'`, `'silent'`) or a full `Diagnostics`
   * instance for custom reporting/policy. The string form needs no import from
   * `@praxis-kit/diagnostics`.
   */
  readonly diagnostics?: Diagnostics | DiagnosticsMode
  /**
   * ARIA/accessibility rules evaluated against the resolved tag and props on every render.
   * Each rule is a function receiving the current context and returning zero or more
   * violations, some of which can carry an auto-applicable fix (see `createRemoveAttributeRule`
   * and friends in `praxis-kit/contract`).
   */
  readonly aria?: readonly AriaRule[]
  /**
   * Rules that need `AriaPolicyEngine`'s fix-application/caching machinery
   * (`AriaRule`'s `readsProps`, fixable `AriaFix` results) but have no
   * relationship to ARIA semantics — an HTML fact or a security check like a
   * dangerous-URL-scheme guard, for example. Evaluated together with `aria`
   * (both run through the same engine, merged into one rule set) — this is a
   * separate bucket purely so a non-ARIA rule doesn't have to sit under the
   * misleading `aria` name to get the machinery it needs.
   */
  readonly rules?: readonly AriaRule[]
  /**
   * Declares which children are valid, by name, match predicate, and cardinality (e.g. "at
   * least 1, at most 4 `Button` children"). Open by default — children matching no rule are
   * still allowed unless `exclusiveChildren` is set.
   */
  readonly children?: readonly ChildRuleInput[]
  /**
   * When true, only children matching a `children` rule (or text, per `allowText`)
   * are valid — anything else is rejected. Default: false (open — children not
   * matching any rule are allowed).
   */
  readonly exclusiveChildren?: boolean
  /**
   * When false, text/number child nodes are rejected regardless of exclusiveChildren
   * or any listed rule. Default: true.
   */
  readonly allowText?: boolean
  /**
   * Prop transforms composed with the component's own `normalize` (from `FactoryOptions`) and
   * run before it. Unlike `normalize`, these live in the enforcement bucket because they
   * typically encode a built-in HTML/ARIA fact rather than component-specific behavior.
   */
  readonly props?: readonly PropNormalizer[]
  /** Restricts the `as` prop to this set of tags. Violations route through diagnostics. */
  readonly allowedAs?: readonly TAllowed[]
  /**
   * Declares that this component's *behavior* — not just its styling — depends on the resolved
   * tag being one of `allowedAs` (e.g. a native invoker attribute like `popoverTarget`, which
   * only functions on button-like elements per the HTML Living Standard). `allowedAs` alone only
   * constrains the `as` prop; it has no effect on `asChild`, which is specifically designed to
   * bypass `allowedAs` so a consumer can compose this component's props onto any element. When
   * both `nativeTagBehavior` and `allowedAs` are set, `asChild` additionally warns — on React,
   * Preact, and Vue; see the adapter-support paragraph below for why those three specifically —
   * if the consumer's child resolves to a tag outside `allowedAs`, catching the case where
   * merging silently breaks the native behavior this flag describes, without blocking the
   * composition (a consumer who genuinely needs a non-allowed element can still proceed).
   * Default: false — ordinary polymorphic components that restrict `allowedAs` for semantic/ARIA
   * reasons with no tag-dependent native behavior (e.g. `Box`) should leave this unset to avoid
   * false positives.
   *
   * This field itself is framework-neutral and honored by every adapter's resolved options, but
   * the runtime check it enables is **only implemented for React, Preact, and Vue** — the three
   * adapters whose `asChild` clones the merged props onto a real, consumer-supplied child element.
   * A multi-element composition (a `Slottable`-wrapped merge target plus pass-through siblings)
   * is still checked correctly on all three — the real merge target is resolved via the same
   * `extractSlottable` lookup Slot's own downstream clone-merge uses, not skipped. Solid's and
   * Svelte's `asChild` instead hands resolved props to a caller-authored render callback/snippet
   * that owns its own output directly, so there is no cloned child element for this check to
   * inspect at render time at all — setting `nativeTagBehavior` on a Solid or Svelte contract has
   * no effect. Lit and Web have no `asChild` at all (see
   * [concepts.md](../../../../../docs/concepts.md#aschild-composition) for the full adapter
   * matrix). Within the three adapters that do implement it, the check is still best-effort, not
   * a guarantee: it's silently skipped when the child's tag can't be statically resolved at
   * all — a child that is itself a custom component never stamped with `markComponentTag` (see
   * `isTag`/`getTag`) — so a real mismatch can still go unwarned in that case.
   */
  readonly nativeTagBehavior?: boolean
}
