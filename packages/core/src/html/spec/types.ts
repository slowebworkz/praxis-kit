// Phase 2 of the semantic spec engine: a declarative shape for "what roles may this element take,"
// general enough to cover the three shapes discovered while extracting input/img/table:
//   - fixed:  the allowed set never varies (table: always ['grid', 'treegrid'])
//   - byProp: the allowed set is looked up by a single prop's string value, with a fallback when
//             the prop is absent (input: keyed by `type`, default "text")
//   - dynamic: the allowed set depends on props in a way a lookup table can't express (img: keyed
//             by whether `alt` is the empty string, not by an enum value)
// `undefined` from `resolveAllowedRoles` means "not modeled" — see `ALLOWED_ROLES`'s doc comment
// in `role-restrictions.ts` for what that means to callers.
export interface RolePolicyContext {
  readonly props: Readonly<Record<string, unknown>>
}

export type RolePolicy =
  | { readonly kind: 'fixed'; readonly roles: readonly string[] }
  | {
      readonly kind: 'byProp'
      readonly prop: string
      readonly map: Readonly<Record<string, readonly string[]>>
      readonly fallback: string
    }
  | {
      readonly kind: 'dynamic'
      readonly resolve: (context: RolePolicyContext) => readonly string[]
    }

// "This attribute only applies when the element's discriminator prop (e.g. `type`) is one of
// `allowedTypes`" — the fact behind input's checked/maxLength/min/etc. policies. Named generically
// since the shape isn't input-specific, even though input is its only consumer so far.
export interface AttributeTypePolicy {
  readonly attribute: string
  readonly allowedTypes: readonly string[]
}

export interface HtmlElementSpec {
  readonly tag: string
  readonly allowedRoles?: RolePolicy
  readonly attributes?: readonly AttributeTypePolicy[]
}

export function resolveAllowedRoles(
  spec: HtmlElementSpec,
  props: Readonly<Record<string, unknown>>,
): readonly string[] | undefined {
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
