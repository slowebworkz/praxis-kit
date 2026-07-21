import type { Simplify } from 'type-fest'
import type { AnyRecord, StringMap } from '@praxis-kit/primitive'
import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import type { AriaRole, Severity } from '../../types'

/**
 * Context supplied to dynamic role resolvers.
 *
 * Wraps the element's properties so additional context can be introduced in the
 * future without changing the resolver function signature.
 */
export interface RolePolicyContext<TProps extends AnyRecord = AnyRecord> {
  readonly props: Readonly<TProps>
}

/**
 * Describes how the set of valid ARIA roles for an HTML element is determined.
 *
 * Most elements fall into one of three categories:
 *
 * - `fixed` — the allowed roles never vary (for example, `<table>`).
 * - `byProp` — the allowed roles are selected by a discriminator property such as
 *   `<input type="...">`.
 * - `dynamic` — the allowed roles depend on arbitrary element state that cannot be
 *   represented as a simple lookup table.
 */
export interface FixedRolePolicy<TRole extends string = AriaRole> {
  readonly kind: 'fixed'
  readonly roles: readonly TRole[]
}

export interface PropRolePolicy<TProp extends string = string, TRole extends string = AriaRole> {
  readonly kind: 'byProp'
  readonly prop: TProp
  readonly map: Readonly<StringMap<readonly TRole[]>>
  readonly fallback: string
}

export interface DynamicRolePolicy<TRole extends string = AriaRole> {
  readonly kind: 'dynamic'
  readonly resolve: (context: RolePolicyContext) => readonly TRole[]
}

export type RolePolicy<TProp extends string = string, TRole extends string = AriaRole> =
  FixedRolePolicy<TRole> | PropRolePolicy<TProp, TRole> | DynamicRolePolicy<TRole>

/**
 * Declares that an attribute is only valid when an element's discriminator value
 * belongs to a particular vocabulary.
 *
 * For example, `<input maxLength>` is only valid for text-like input types, while
 * `<input accept>` is only valid for `type="file"`.
 *
 * The generic parameters constrain the attribute-name and discriminator
 * vocabularies so element-specific specs retain literal type safety.
 */
export interface AttributeTypePolicy<
  TAttribute extends string = string,
  TType extends string = string,
> {
  readonly attribute: TAttribute
  readonly allowedTypes: readonly TType[]
}

/**
 * The diagnostic shape returned by semantic specification tables.
 *
 * Extends `DiagnosticInput` with a concrete severity so validators can emit
 * diagnostics without supplying severity separately.
 */
export interface AriaDiagnosticFact extends DiagnosticInput {
  readonly severity: Severity
}

/**
 * Declares a pair of properties that must not appear together.
 *
 * The diagnostic remains caller-supplied so each policy can explain the conflict
 * using domain-specific wording instead of a generic message.
 */
export interface MutuallyExclusivePolicy {
  readonly props: readonly [string, string]
  readonly diagnostic: () => AriaDiagnosticFact
}

/**
 * Identifies the HTML element described by a semantic specification.
 */
export interface HtmlElementBase<TTag extends string = string> {
  readonly tag: TTag
}

/**
 * Capability indicating that an element constrains its permitted ARIA roles.
 */
export interface HasAllowedRoles<TProp extends string = string, TRole extends string = AriaRole> {
  readonly allowedRoles: RolePolicy<TProp, TRole>
}

/**
 * Capability indicating that an element places type-dependent restrictions on
 * one or more attributes.
 */
export interface HasAttributePolicies<
  TAttribute extends string = string,
  TType extends string = string,
> {
  readonly attributes: readonly AttributeTypePolicy<TAttribute, TType>[]
}

/**
 * Capability indicating that an element defines mutually exclusive property
 * combinations.
 */
export interface HasMutuallyExclusivePolicies {
  readonly mutuallyExclusive: readonly MutuallyExclusivePolicy[]
}

/**
 * Declarative semantic description of an HTML element.
 *
 * Each capability is optional because only the semantics modeled by Praxis Kit
 * need to be present. Consumers depend only on the capabilities they require
 * rather than the entire specification.
 *
 * `Simplify` is used purely to improve editor tooltips by flattening the
 * composed intersection into a single object shape.
 */
export type HtmlElementSpec<
  TTag extends string = string,
  TAttribute extends string = string,
  TType extends string = string,
  TProp extends string = string,
  TRole extends string = AriaRole,
> = Simplify<
  HtmlElementBase<TTag> &
    Partial<HasAllowedRoles<TProp, TRole>> &
    Partial<HasAttributePolicies<TAttribute, TType>> &
    Partial<HasMutuallyExclusivePolicies>
>

/**
 * Creates a property-discriminated role policy.
 *
 * The fallback discriminator is constrained to the keys of `map`, preventing
 * specifications from referring to a non-existent fallback entry. The role
 * vocabulary is inferred from `map`, preserving literal role types instead of
 * widening them to `AriaRole`.
 */
export function definePropRolePolicy<
  TProp extends string,
  TRole extends string,
  TMap extends StringMap<readonly TRole[]>,
>(prop: TProp, map: TMap, fallback: keyof TMap & string): RolePolicy<TProp, TRole> {
  return { kind: 'byProp', prop, map, fallback }
}

export function resolveAllowedRoles(
  spec: HtmlElementSpec,
  props: Readonly<AnyRecord>,
): readonly AriaRole[] | undefined {
  const policy = spec.allowedRoles
  if (!policy) return undefined
  switch (policy.kind) {
    case 'fixed':
      return policy.roles
    case 'byProp': {
      const value =
        typeof props[policy.prop] === 'string' ? (props[policy.prop] as string) : policy.fallback
      return policy.map[value]
    }
    case 'dynamic':
      return policy.resolve({ props })
  }
}
