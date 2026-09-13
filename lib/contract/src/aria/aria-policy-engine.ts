import {
  isDefined,
  isNonNull,
  isNull,
  isString,
  isUndefined,
  iterate,
  LRUCache,
} from '@praxis-kit/primitive'

import { AriaDiagnostics, HtmlDiagnostics } from '../diagnostics'
import { InvariantBase } from '../strict'
import { isAriaAttributeValidForRole, isGlobalAriaAttribute } from './aria-attribute-policy'
import { getImplicitRole, hasStandaloneRole, isStrongImplicitRole } from './aria-role-policy'
import { applyPlan, computePlan, createPlanKey, extraRulesKeySuffix } from './plan-cache'
import { VALID_RELEVANT_TOKENS } from './spec/attributes/aria-relevant-tokens'
import { ARIA_VALUE_TYPES } from './spec/attributes/aria-value-types'
import { isPotentiallyFocusable } from './spec/elements/focusable'
import { HEADING_IMPLICIT_LEVELS } from './spec/elements/heading-implicit-levels'
import { ATOMIC_REQUIREMENTS, LIVE_REGION_ROLES } from './spec/roles/live-region'
import { NAME_PROHIBITED_ATTRIBUTES, NAME_PROHIBITED_ROLES } from './spec/roles/name-prohibited'
import { NAME_REQUIRED_ROLES } from './spec/roles/name-required'
import { REQUIRED_ARIA_PROPERTIES } from './spec/roles/required-properties'
import type { RoleAttributeRequirements } from './spec/types'
import { checkRequiredAttributes } from './spec/validators/required-properties-validator'
import { describeExpected, isValidAriaValue, strictNumeric } from './value-validation'

import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { AnyRecord, IntrinsicTag } from '@praxis-kit/primitive'
import type {
  AnyTag,
  AriaContext,
  AriaFix,
  AriaPlan,
  AriaResult,
  AriaRule,
  EvaluationContext,
  IntrinsicProps,
  NormalizationResult,
  PropsWithRole,
  ValidationResult,
  ValidationViolation,
} from '../types'
export { isInvalid } from '@praxis-kit/primitive'

// The shared "valid, no violations" return for a rule with nothing to report. An array (not a
// bare `[]`) because it's typed as `readonly AriaResult[]` and every rule returns this exact
// reference on its common path — reusing one frozen-shape array avoids a fresh allocation on
// every rule call for what is overwhelmingly the common case. Named for the value it represents
// (a single valid `AriaResult`), not the situation a caller uses it for.
const VALID_RESULT = [{ valid: true }] as const

// Shared empty set for AriaContext.variantKeys when there is no factory context (the standalone
// `AriaPolicyEngine.evaluate` path). Keeps the context invariant a plain `ReadonlySet<string>`
// instead of `ReadonlySet<string> | undefined`, so rules never branch on an absent set.
const NO_VARIANT_KEYS: ReadonlySet<string> = new Set()

function isIntrinsicTag(tag: AnyTag): tag is IntrinsicTag {
  return isString(tag)
}

function omitProp<T extends Readonly<AnyRecord>, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const { [key]: _, ...rest } = obj
  return rest as Omit<T, K>
}

export class AriaPolicyEngine extends InvariantBase {
  readonly #extraRules: readonly AriaRule[]
  // The component's declared variant prop names, threaded into every AriaContext so a rule
  // can tell a variant key apart from a real HTML attribute of the same name (see #39). Fixed
  // per engine instance, so it never needs to enter the plan cache key.
  readonly #variantKeys: ReadonlySet<string>
  readonly #planCache = new LRUCache<string, AriaPlan>(100)
  // Memoized AriaFix objects keyed by attribute name — the ARIA attribute set is
  // finite so this Map is bounded and avoids recreating closures on every cache miss.
  static readonly #removeAttributeFixCache = new Map<string, AriaFix>()

  constructor(
    diagnostics: Diagnostics,
    options?: { rules?: readonly AriaRule[]; variantKeys?: ReadonlySet<string> },
  ) {
    super(diagnostics)
    this.#extraRules = options?.rules ?? []
    this.#variantKeys = options?.variantKeys ?? NO_VARIANT_KEYS
  }

  static #normalizeEmptyRole(tag: IntrinsicTag, props: IntrinsicProps): NormalizationResult {
    if (props.role !== '') return { normalized: false }
    const d = HtmlDiagnostics.emptyRole(tag)
    return {
      normalized: true,
      result: {
        props: omitProp(props, 'role'),
        violations: [
          {
            message: d.message,
            diagnostic: d,
            tag,
            role: '',
            attribute: undefined,
            severity: d.severity,
            phase: 'evaluate',
          },
        ],
      },
    }
  }

  static #deriveContext(
    tag: AnyTag,
    props: IntrinsicProps,
    variantKeys: ReadonlySet<string> = NO_VARIANT_KEYS,
  ): EvaluationContext {
    if (!isIntrinsicTag(tag)) return { proceed: false, result: { props, violations: [] } }
    const implicitRole = getImplicitRole(tag, props)
    // hasRole marks whether the element has native or author-supplied ARIA semantics (implicit
    // role, or a non-empty explicit role). It gates only the built-in role-semantic rule tiers
    // (see #getRules) — it must not gate the whole context, since a consumer's own #extraRules
    // may have nothing to do with roles and should still run for every element.
    const hasRole =
      isNonNull(implicitRole) || (isString(props.role) && (props.role as string).length > 0)

    // Normalizing an empty role only strips `role` and emits its own warning — it must not
    // short-circuit the rest of validation. An element with role="" and an implicit role (e.g.
    // <footer role="" aria-autocomplete="all">) still has aria-* attributes worth checking; a
    // bare `return` here previously skipped that pipeline entirely for the render that
    // introduced the empty role, letting invalid aria-* values through unvalidated.
    const normalized = AriaPolicyEngine.#normalizeEmptyRole(tag, props)
    // normalized.result.props is typed as the broader AnyRecord (ValidationResult's shape) but
    // is always `props` with `role` stripped, which still satisfies IntrinsicProps (role is
    // optional there).
    const workingProps = normalized.normalized ? (normalized.result.props as IntrinsicProps) : props
    const preExistingViolations = normalized.normalized ? normalized.result.violations : []

    const effectiveRole = workingProps.role ?? implicitRole
    return {
      proceed: true,
      tag,
      implicitRole,
      effectiveRole,
      hasRole,
      props: workingProps,
      preExistingViolations,
      context: { tag, props: workingProps, implicitRole, effectiveRole, variantKeys },
    }
  }

  static #runRules(
    rules: readonly AriaRule[],
    context: AriaContext,
  ): { violations: ValidationViolation[]; fixes: AriaFix[] } {
    const violations: ValidationViolation[] = []
    const fixes: AriaFix[] = []

    iterate.forEach(rules, (rule) => {
      // A rule that declares `tags` can only ever produce a result for those tags — skip calling
      // it at all for any other tag, rather than paying for the call just to hit its own internal
      // `if (tag !== ...) return []` early return.
      if (isNonNull(rule.tags) && !rule.tags.includes(context.tag)) return
      iterate.forEach(rule(context), (result) => {
        if (result.valid) return

        const {
          tag,
          props: { role },
        } = context
        const { message, attribute, severity } = result
        const resolvedMessage = message ?? result.diagnostic?.message
        const fallbackDiag = isNonNull(resolvedMessage)
          ? undefined
          : AriaDiagnostics.invalidRole(role, tag)
        violations.push({
          message: resolvedMessage ?? fallbackDiag!.message,
          tag,
          role,
          attribute,
          severity,
          phase: 'evaluate',
          ...(isNonNull(result.diagnostic) && { diagnostic: result.diagnostic }),
          ...(isNonNull(fallbackDiag) && { diagnostic: fallbackDiag }),
        })
        if (result.fixable) fixes.push(result.fix)
      })
    })

    return { violations, fixes }
  }

  static #getRules(context: AriaContext): readonly AriaRule[] {
    // Run the full pipeline when there's an explicit role, or when the implicit role
    // is a live-region role (so that injection and advisory checks fire even without
    // an explicit role prop — e.g. <output> implicitly has role=status).
    if (
      AriaPolicyEngine.#hasRole(context.props) ||
      (isNonNull(context.effectiveRole) && LIVE_REGION_ROLES.has(context.effectiveRole))
    ) {
      return AriaPolicyEngine.#pipeline
    }
    return AriaPolicyEngine.#implicitOnlyRules
  }

  static evaluate(tag: AnyTag, props: IntrinsicProps): ValidationResult {
    const derived = AriaPolicyEngine.#deriveContext(tag, props)
    if (!derived.proceed) return derived.result
    // No extra rules and no role semantics — nothing to evaluate.
    if (!derived.hasRole)
      return { props: derived.props, violations: [...derived.preExistingViolations] }

    const {
      tag: narrowedTag,
      implicitRole,
      context,
      props: workingProps,
      preExistingViolations,
    } = derived
    const { violations, fixes } = AriaPolicyEngine.#runRules(
      AriaPolicyEngine.#getRules(context),
      context,
    )
    const next = AriaPolicyEngine.#applyFixes(narrowedTag, implicitRole, workingProps, fixes)
    return { props: next, violations: [...preExistingViolations, ...violations] }
  }

  static #evaluateWithRules(
    tag: AnyTag,
    props: IntrinsicProps,
    extraRules: readonly AriaRule[],
    extraProps?: IntrinsicProps,
    variantKeys: ReadonlySet<string> = NO_VARIANT_KEYS,
  ): ValidationResult {
    const derived = AriaPolicyEngine.#deriveContext(tag, props, variantKeys)
    if (!derived.proceed) return derived.result

    const {
      tag: narrowedTag,
      implicitRole,
      context,
      props: workingProps,
      preExistingViolations,
    } = derived
    // Built-in role-semantic rules are meaningless without a role and stay gated on hasRole, but
    // a consumer's own extraRules may have no relationship to roles at all (an attribute-type
    // fact, a security check) — they must always run, regardless of whether this element has any
    // ARIA semantics.
    const builtinRules = derived.hasRole ? AriaPolicyEngine.#getRules(context) : []
    const builtin = AriaPolicyEngine.#runRules(builtinRules, context)

    // extraRules (a consumer's own `enforcement.aria`/`enforcement.rules`) read `extraProps`
    // instead of `context.props` when the caller supplies it — the pre-variant-filter props
    // object (the same one `normalize()` already receives), not the DOM-bound `workingProps`
    // built-in rules evaluate against. This lets a rule read a variant-only prop (e.g. a
    // styling-only `float`/`width`) the way `normalize` already can. Fixes still apply against
    // `workingProps` below, so a fix can only ever add/remove real DOM-bound attributes — a
    // variant key read here can never leak into the returned props.
    const extraContext: AriaContext =
      extraProps === undefined ? context : { ...context, props: extraProps }
    const extra = AriaPolicyEngine.#runRules(extraRules, extraContext)

    const violations = [...builtin.violations, ...extra.violations]
    const fixes = [...builtin.fixes, ...extra.fixes]
    const next = AriaPolicyEngine.#applyFixes(
      narrowedTag,
      implicitRole,
      workingProps,
      fixes,
      variantKeys,
    )
    return { props: next, violations: [...preExistingViolations, ...violations] }
  }

  report(violations: ReadonlyArray<ValidationViolation>): void {
    iterate.forEach(violations, (v) => {
      const d = v.diagnostic ?? AriaDiagnostics.fromViolation(v)
      if (v.severity === 'error') this.violate(d)
      else this.warn(d)
    })
  }

  // `extraProps`, when supplied, is the pre-variant-filter props object (the same one
  // `normalize()` receives) — used only as the evaluation context for this engine's own
  // #extraRules (a consumer's `enforcement.aria`/`enforcement.rules`), never for the built-in
  // role-semantic pipeline or for the props a fix can apply to. Defaults to `props` so callers
  // that don't have a separate pre-filter object (or don't need one) see unchanged behavior.
  validate(tag: AnyTag, props: IntrinsicProps, extraProps?: IntrinsicProps): ValidationResult {
    const ruleProps = extraProps ?? props
    // Custom `enforcement.aria` rules (#extraRules) may read arbitrary props that
    // createPlanKey doesn't encode (it only covers what the built-in pipeline reads). A rule
    // that declares `readsProps` opts back into caching — its declared props get folded into
    // the key, read off `ruleProps` since that's what the rule itself actually sees. Any extra
    // rule without `readsProps` is assumed unsafe to cache and bypasses the plan cache entirely
    // for this validate() call.
    const baseKey = createPlanKey(tag, props)
    let key: string | null = baseKey
    if (this.#extraRules.length > 0) {
      const suffix = extraRulesKeySuffix(this.#extraRules, ruleProps)
      key = isNonNull(baseKey) && isNonNull(suffix) ? `${baseKey}|${suffix}` : null
    }

    if (!isNull(key)) {
      const cached = this.#planCache.get(key)
      if (isDefined(cached)) {
        if (cached.violations.length > 0) this.report(cached.violations as ValidationViolation[])
        return {
          props: applyPlan(props, cached.removals, cached.updates),
          violations: cached.violations as ValidationViolation[],
        }
      }
    }

    const result = this.#extraRules.length
      ? AriaPolicyEngine.#evaluateWithRules(
          tag,
          props,
          this.#extraRules,
          extraProps,
          this.#variantKeys,
        )
      : AriaPolicyEngine.evaluate(tag, props)

    if (result.violations.length > 0) this.report(result.violations)

    if (!isNull(key)) {
      const { removals, updates } = computePlan(props, result.props as IntrinsicProps)
      const plan: AriaPlan = { removals, updates, violations: result.violations }
      this.#planCache.set(key, plan)
    }

    return result
  }

  static #hasRole(props: IntrinsicProps): props is PropsWithRole {
    return isString(props.role) && props.role.length > 0
  }

  static #applyFixes<T extends IntrinsicProps>(
    tag: IntrinsicTag,
    implicitRole: AriaContext['implicitRole'],
    props: T,
    fixes: AriaFix[],
    variantKeys: ReadonlySet<string> = NO_VARIANT_KEYS,
  ): T {
    if (fixes.length === 0) return props
    const sorted = [...fixes].sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity))
    let next: IntrinsicProps = props
    iterate.forEach(sorted, ({ apply }) => {
      const effectiveRole = next.role ?? implicitRole
      const fixContext: AriaContext = { tag, implicitRole, effectiveRole, props: next, variantKeys }
      const fixResult = apply(fixContext)
      if (fixResult.applied) next = fixResult.next as IntrinsicProps
    })
    return next as T
  }

  static readonly #removeRole: AriaFix = {
    kind: 'removeRole',
    apply: ({ props }) => {
      if (!('role' in props)) return { applied: false, next: props }
      return { applied: true, next: omitProp(props, 'role'), previous: props }
    },
  }

  static #makeRemoveAttributeFix(attr: string): AriaFix {
    const cached = AriaPolicyEngine.#removeAttributeFixCache.get(attr)
    if (cached) return cached
    const fix: AriaFix = {
      kind: 'removeAttribute',
      attribute: attr,
      apply: ({ props }) => {
        if (!(attr in props)) return { applied: false, next: props }
        return { applied: true, next: omitProp(props, attr), previous: props }
      },
    }
    AriaPolicyEngine.#removeAttributeFixCache.set(attr, fix)
    return fix
  }

  // Snapshot diagnostic model: all rules evaluate against the same (tag, props, implicitRole) snapshot.
  static readonly #pipeline = [
    AriaPolicyEngine.#checkInvalidRoleOverride,
    AriaPolicyEngine.#checkRedundantRole,
    AriaPolicyEngine.#checkStandaloneRegion,
    AriaPolicyEngine.#checkAriaAttributeValues,
    AriaPolicyEngine.#checkInvalidAriaAttributes,
    AriaPolicyEngine.#checkNameProhibitedRoles,
    AriaPolicyEngine.#checkRequiredAriaProperties,
    AriaPolicyEngine.#checkNameRequiredRoles,
    AriaPolicyEngine.#checkRedundantAriaLevel,
    AriaPolicyEngine.#checkMissingLiveRegion,
    AriaPolicyEngine.#checkMissingAtomic,
    AriaPolicyEngine.#checkInvalidAriaRelevant,
    AriaPolicyEngine.#checkAriaHiddenOnFocusable,
    AriaPolicyEngine.#checkPresentationalAriaAttributes,
  ] as const satisfies readonly AriaRule[]

  // Rules for elements with an implicit role but no explicit role (not a live region).
  // `#checkRequiredAriaProperties` is intentionally absent — required properties are an authoring
  // obligation for an explicitly assigned role only (F4). `#checkNameRequiredRoles` stays: it
  // covers `role=img` (incl. the implicit one on a bare `<img>`), which is useless without a name.
  static readonly #implicitOnlyRules = [
    AriaPolicyEngine.#checkAriaAttributeValues,
    AriaPolicyEngine.#checkInvalidAriaAttributes,
    AriaPolicyEngine.#checkNameProhibitedRoles,
    AriaPolicyEngine.#checkNameRequiredRoles,
    AriaPolicyEngine.#checkRedundantAriaLevel,
    AriaPolicyEngine.#checkAriaHiddenOnFocusable,
    AriaPolicyEngine.#checkPresentationalAriaAttributes,
  ] as const satisfies readonly AriaRule[]

  static #checkInvalidRoleOverride({
    tag,
    props,
    implicitRole,
  }: AriaContext): readonly AriaResult[] {
    const role = props.role
    if (!implicitRole || isUndefined(role) || role === implicitRole) return VALID_RESULT

    if (isStrongImplicitRole(tag) && role === 'region') {
      const diagnostic = HtmlDiagnostics.implicitRoleOverride(tag, implicitRole, role)
      return [
        {
          valid: false,
          fixable: true,
          severity: diagnostic.severity,
          fix: AriaPolicyEngine.#removeRole,
          diagnostic,
        },
      ]
    }

    return VALID_RESULT
  }

  static #checkRedundantRole({ tag, props, implicitRole }: AriaContext): readonly AriaResult[] {
    const role = props.role
    if (!implicitRole || isUndefined(role) || role !== implicitRole) return VALID_RESULT

    const diagnostic = HtmlDiagnostics.implicitRoleRedundant(tag, implicitRole)
    return [
      {
        valid: false,
        fixable: true,
        severity: diagnostic.severity,
        fix: AriaPolicyEngine.#removeRole,
        diagnostic,
      },
    ]
  }

  static #checkStandaloneRegion({ tag, props, implicitRole }: AriaContext): readonly AriaResult[] {
    const role = props.role
    if (role !== 'region') return VALID_RESULT
    if (!hasStandaloneRole(tag)) return VALID_RESULT

    const diagnostic = HtmlDiagnostics.standaloneRegionOverride(tag, implicitRole ?? tag)
    return [
      {
        valid: false,
        fixable: true,
        severity: diagnostic.severity,
        fix: AriaPolicyEngine.#removeRole,
        diagnostic,
      },
    ]
  }

  static #checkInvalidAriaAttributes({
    tag,
    props,
    effectiveRole,
  }: AriaContext): readonly AriaResult[] {
    // Presentational elements have no semantic role — defer entirely to #checkPresentationalAriaAttributes.
    if (effectiveRole === 'none' || effectiveRole === 'presentation') return VALID_RESULT
    const results: AriaResult[] = []

    iterate.forEachEntry(props, (key) => {
      if (!key.startsWith('aria-')) return
      if (isGlobalAriaAttribute(key)) return
      if (isAriaAttributeValidForRole(key, effectiveRole)) return

      results.push({
        valid: false,
        severity: 'warning',
        fixable: true,
        attribute: key,
        diagnostic: AriaDiagnostics.attributeInvalid(key, effectiveRole ?? tag),
        fix: AriaPolicyEngine.#makeRemoveAttributeFix(key),
      })
    })

    return results
  }

  // ─── ARIA attribute value validation ──────────────────────────────────────
  // See value-validation.ts for the value-type system itself (isValidAriaValue/
  // describeExpected/strictNumeric) — this rule is just a thin caller of it.

  static #checkAriaAttributeValues({ props, effectiveRole }: AriaContext): readonly AriaResult[] {
    // Presentational elements have no ARIA semantics — all attrs handled elsewhere.
    if (effectiveRole === 'none' || effectiveRole === 'presentation') return VALID_RESULT
    const results: AriaResult[] = []
    iterate.forEachEntry(props, (key, value) => {
      if (!key.startsWith('aria-')) return
      const type = ARIA_VALUE_TYPES.get(key)
      if (!isNonNull(type)) return
      if (isValidAriaValue(value, type)) return
      results.push({
        valid: false,
        fixable: true,
        severity: 'warning',
        attribute: key,
        diagnostic: AriaDiagnostics.invalidAttributeValue(key, value, describeExpected(type)),
        fix: AriaPolicyEngine.#makeRemoveAttributeFix(key),
      })
    })
    return results
  }

  // ─── Heading implicit level ────────────────────────────────────────────────

  static #checkRedundantAriaLevel({
    tag,
    props,
    effectiveRole,
  }: AriaContext): readonly AriaResult[] {
    if (effectiveRole === 'none' || effectiveRole === 'presentation') return VALID_RESULT
    const implicitLevel = HEADING_IMPLICIT_LEVELS.get(tag)
    if (!isNonNull(implicitLevel)) return VALID_RESULT
    const raw = props['aria-level']
    if (!isNonNull(raw)) return VALID_RESULT
    const n = strictNumeric(raw)
    if (n === undefined || n !== implicitLevel) return VALID_RESULT
    return [
      {
        valid: false,
        fixable: true,
        severity: 'warning',
        attribute: 'aria-level',
        diagnostic: AriaDiagnostics.redundantAriaLevel(tag, implicitLevel),
        fix: AriaPolicyEngine.#makeRemoveAttributeFix('aria-level'),
      },
    ]
  }

  // ─── Name-prohibited roles ─────────────────────────────────────────────────

  // WAI-ARIA 1.2 §5.2.8.6: `generic` and the inline text-level roles do not support a name from
  // the author, so `aria-label` / `aria-labelledby` on them is a conformance error (they are
  // otherwise global). Strips the offending attribute. `none`/`presentation` are in the source
  // set but handled by `#checkPresentationalAriaAttributes` instead — skip them here.
  static #checkNameProhibitedRoles({ props, effectiveRole }: AriaContext): readonly AriaResult[] {
    if (
      !effectiveRole ||
      effectiveRole === 'none' ||
      effectiveRole === 'presentation' ||
      !NAME_PROHIBITED_ROLES.has(effectiveRole)
    ) {
      return VALID_RESULT
    }
    const results: AriaResult[] = []
    for (const key of NAME_PROHIBITED_ATTRIBUTES) {
      if (!(key in props)) continue
      results.push({
        valid: false,
        fixable: true,
        severity: 'warning',
        attribute: key,
        diagnostic: AriaDiagnostics.nameProhibited(key, effectiveRole),
        fix: AriaPolicyEngine.#makeRemoveAttributeFix(key),
      })
    }
    return results
  }

  // ─── Name-required roles ───────────────────────────────────────────────────

  static #checkNameRequiredRoles({
    tag,
    props,
    effectiveRole,
  }: AriaContext): readonly AriaResult[] {
    if (!effectiveRole || !NAME_REQUIRED_ROLES.has(effectiveRole)) return VALID_RESULT
    if ('aria-label' in props || 'aria-labelledby' in props) return VALID_RESULT
    // Native <img> elements can satisfy the name requirement with a non-empty alt attribute.
    if (tag === 'img' && isString(props.alt) && props.alt.length > 0) return VALID_RESULT
    return [
      {
        valid: false,
        fixable: false,
        severity: 'warning',
        diagnostic: AriaDiagnostics.missingAccessibleName(tag),
      },
    ]
  }

  static readonly #requiredAriaPropertiesRule: RoleAttributeRequirements = {
    attributesByRole: REQUIRED_ARIA_PROPERTIES,
    diagnosticFor: (attribute, role) => AriaDiagnostics.requiredProperty(attribute, role),
  }

  // WAI-ARIA "Required States and Properties" is an authoring obligation for an *explicitly
  // assigned* role. A native element carrying an *implicit* role provides that role's required
  // semantics itself — a bare `<input type="range">` has a value without `aria-valuenow`, a bare
  // `<select>` is a combobox without `aria-expanded`. So this check only runs when the author set
  // an explicit `role`. (F4 — replaced a per-tag exemption map; see
  // docs/accessibility/html-aria-audit.md.)
  static #checkRequiredAriaProperties(context: AriaContext): readonly AriaResult[] {
    if (!isNonNull(context.props.role)) return VALID_RESULT
    return checkRequiredAttributes(AriaPolicyEngine.#requiredAriaPropertiesRule, context)
  }

  // WAI-ARIA 1.2 §6.6: aria-hidden="true" must not be placed on focusable elements.
  // Focusability is prop-aware (`isPotentiallyFocusable`): a bare `<a>`/`<area>` with no href,
  // an `<input type="hidden">`, and a `disabled` form control are not focusable; `tabindex >= 0`
  // or `contenteditable` makes any element focusable.
  static #checkAriaHiddenOnFocusable({ tag, props }: AriaContext): readonly AriaResult[] {
    if (props['aria-hidden'] !== 'true' && props['aria-hidden'] !== true) return VALID_RESULT
    if (!isPotentiallyFocusable(tag, props)) return VALID_RESULT
    return [
      {
        valid: false,
        fixable: false,
        severity: 'error',
        attribute: 'aria-hidden',
        diagnostic: AriaDiagnostics.ariaHiddenOnFocusable(tag),
      },
    ]
  }

  // Presentational elements (role=none/presentation, including <img alt="">) are removed
  // from the accessibility tree — ARIA attributes on them are meaningless and misleading.
  static #checkPresentationalAriaAttributes({
    tag,
    props,
    effectiveRole,
  }: AriaContext): readonly AriaResult[] {
    if (effectiveRole !== 'none' && effectiveRole !== 'presentation') return VALID_RESULT
    const results: AriaResult[] = []
    iterate.forEachEntry(props, (key) => {
      if (!key.startsWith('aria-')) return
      // aria-hidden is permitted: it further removes the element from the accessibility
      // tree, which is redundant but not harmful, and avoids noise from defensive coding.
      if (key === 'aria-hidden') return
      results.push({
        valid: false,
        fixable: true,
        severity: 'warning',
        attribute: key,
        diagnostic: AriaDiagnostics.attributeOnPresentational(key, tag),
        fix: AriaPolicyEngine.#makeRemoveAttributeFix(key),
      })
    })
    return results
  }

  static #checkMissingLiveRegion({ effectiveRole, props }: AriaContext): readonly AriaResult[] {
    if (!effectiveRole) return VALID_RESULT
    const impliedLive = LIVE_REGION_ROLES.get(effectiveRole)
    if (!impliedLive) return VALID_RESULT
    // `props` is the pre-fix snapshot every rule in this pass evaluates against (see #pipeline),
    // so this only sees that the *key* is present, not whether its value is valid. An invalid
    // aria-live value (caught separately by #checkAriaAttributeValues, which strips it) still
    // counts as "present" here and suppresses injection for this pass — the correct value gets
    // injected on the next validate() call, once the invalid value is actually gone from props.
    if ('aria-live' in props) return VALID_RESULT

    const injectLive: AriaFix = {
      kind: 'injectLive',
      attribute: 'aria-live',
      apply: (ctx) => ({
        applied: true,
        next: { ...ctx.props, 'aria-live': impliedLive },
        previous: ctx.props,
      }),
    }

    return [
      {
        valid: false,
        fixable: true,
        severity: 'warning',
        fix: injectLive,
        diagnostic: AriaDiagnostics.missingLiveRegion(effectiveRole, impliedLive),
      },
    ]
  }

  static readonly #missingAtomicRule: RoleAttributeRequirements = {
    attributesByRole: ATOMIC_REQUIREMENTS,
    diagnosticFor: (_attribute, role) => AriaDiagnostics.missingAtomic(role),
  }

  static #checkMissingAtomic(context: AriaContext): readonly AriaResult[] {
    return checkRequiredAttributes(AriaPolicyEngine.#missingAtomicRule, context)
  }

  // Custom fix rules passed via `options.rules` must be pure functions of (tag, props) — the cache
  // replays stored fixes against new prop objects, so fixes that close over external state will
  // produce inconsistent results on cache hits.
  static readonly #normalizeRelevantAllFix: AriaFix = {
    kind: 'normalizeRelevantAll',
    apply: ({ props: p }) => ({
      applied: true,
      next: { ...p, 'aria-relevant': 'all' },
      previous: p,
    }),
  }

  static #checkInvalidAriaRelevant({ props }: AriaContext): readonly AriaResult[] {
    const relevant = props['aria-relevant']
    if (isUndefined(relevant)) return VALID_RESULT
    if (!isString(relevant)) return VALID_RESULT

    const tokens = relevant.trim().split(/\s+/)
    const invalid = tokens.filter((t) => !VALID_RELEVANT_TOKENS.has(t))
    if (invalid.length > 0) {
      return [
        {
          valid: false,
          fixable: true,
          severity: 'warning',
          attribute: 'aria-relevant',
          diagnostic: AriaDiagnostics.relevantInvalidTokens(invalid),
          fix: AriaPolicyEngine.#makeRemoveAttributeFix('aria-relevant'),
        },
      ]
    }

    // "all" supersedes the other tokens — "all additions text" is redundant, normalize to "all".
    if (tokens.includes('all') && tokens.length > 1) {
      return [
        {
          valid: false,
          fixable: true,
          severity: 'warning',
          attribute: 'aria-relevant',
          diagnostic: AriaDiagnostics.relevantSuperseded(),
          fix: AriaPolicyEngine.#normalizeRelevantAllFix,
        },
      ]
    }

    return VALID_RESULT
  }
}
