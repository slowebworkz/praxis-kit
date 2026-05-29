import type { ElementType, IntrinsicTag } from '@praxis-ui/primitive'
import { StrictBase } from '../strict'
import type {
  AriaContext,
  AriaFix,
  AriaResult,
  AriaRule,
  EvaluationContext,
  FixKind,
  IntrinsicProps,
  InvalidResult,
  NormalizationResult,
  PropsWithRole,
  StrictMode,
  ValidationResult,
  ValidationViolation,
} from '../types'
import { isAriaAttributeValidForRole, isGlobalAriaAttribute } from './aria-attribute-policy'
import { getImplicitRole, isStandaloneTag, isStrongImplicitRole } from './aria-role-policy'

export function isInvalid(result: AriaResult): result is InvalidResult {
  return result.valid === false
}

const VALID = [{ valid: true }] as const

// Broader than ElementType: accepts component functions so adapters can pass the `as` prop directly.
type AnyTag = ElementType | ((...args: unknown[]) => unknown)

function isIntrinsicTag(tag: AnyTag): tag is IntrinsicTag {
  return typeof tag === 'string'
}

function omitProp<T extends Readonly<Record<string, unknown>>, K extends keyof T>(
  obj: T,
  key: K,
): Omit<T, K> {
  const { [key]: _, ...rest } = obj
  return rest as Omit<T, K>
}

type AriaPlan = {
  readonly removals: ReadonlySet<string>
  readonly violations: readonly ValidationViolation[]
}

export class AriaPolicyEngine extends StrictBase {
  readonly #extraRules: readonly AriaRule[]
  readonly #planCache = new Map<string, AriaPlan>()
  static readonly #MAX_CACHE = 100
  // Memoized AriaFix objects keyed by attribute name — the ARIA attribute set is
  // finite so this Map is bounded and avoids recreating closures on every cache miss.
  static readonly #removeAttributeFixCache = new Map<string, AriaFix>()

  constructor(strict: StrictMode = 'warn', options?: { rules?: readonly AriaRule[] }) {
    super(strict)
    this.#extraRules = options?.rules ?? []
  }

  static #normalizeEmptyRole(tag: IntrinsicTag, props: IntrinsicProps): NormalizationResult {
    if (props.role !== '') return { normalized: false }
    return {
      normalized: true,
      result: {
        props: omitProp(props, 'role'),
        violations: [
          {
            message: `<${tag}> has an explicit empty role="". Omit the attribute instead.`,
            tag,
            role: '',
            attribute: undefined,
            severity: 'warning',
            phase: 'evaluate',
          },
        ],
      },
    }
  }

  static #deriveContext(tag: AnyTag, props: IntrinsicProps): EvaluationContext {
    if (!isIntrinsicTag(tag)) return { proceed: false, result: { props, violations: [] } }
    const implicitRole = getImplicitRole(tag)
    if (!implicitRole) return { proceed: false, result: { props, violations: [] } }

    const normalized = AriaPolicyEngine.#normalizeEmptyRole(tag, props)
    if (normalized.normalized) return { proceed: false, result: normalized.result }

    const effectiveRole = props.role ?? implicitRole
    return {
      proceed: true,
      tag,
      implicitRole,
      effectiveRole,
      context: { tag, props, implicitRole, effectiveRole },
    }
  }

  static #runRules(
    rules: readonly AriaRule[],
    context: AriaContext,
  ): { violations: ValidationViolation[]; fixes: Map<FixKind, AriaFix> } {
    const violations: ValidationViolation[] = []
    const fixes = new Map<FixKind, AriaFix>()

    for (const rule of rules) {
      for (const result of rule(context)) {
        if (!result.valid) {
          violations.push({
            message: result.message ?? `Invalid role "${context.props.role}" on <${context.tag}>`,
            tag: context.tag,
            role: context.props.role,
            attribute: result.attribute,
            severity: result.severity,
            phase: 'evaluate',
          })
          if (result.fixable) fixes.set(result.fix.kind, result.fix)
        }
      }
    }

    return { violations, fixes }
  }

  static #getRules(context: AriaContext): readonly AriaRule[] {
    return AriaPolicyEngine.#hasRole(context.props)
      ? AriaPolicyEngine.#pipeline
      : [AriaPolicyEngine.#checkInvalidAriaAttributes]
  }

  static evaluate(tag: AnyTag, props: IntrinsicProps): ValidationResult {
    const derived = AriaPolicyEngine.#deriveContext(tag, props)
    if (!derived.proceed) return derived.result

    const { tag: narrowedTag, implicitRole, context } = derived
    const { violations, fixes } = AriaPolicyEngine.#runRules(
      AriaPolicyEngine.#getRules(context),
      context,
    )
    const next = AriaPolicyEngine.#applyFixes(narrowedTag, implicitRole, props, fixes)
    return { props: next, violations }
  }

  static #evaluateWithRules(
    tag: AnyTag,
    props: IntrinsicProps,
    extraRules: readonly AriaRule[],
  ): ValidationResult {
    const derived = AriaPolicyEngine.#deriveContext(tag, props)
    if (!derived.proceed) return derived.result

    const { tag: narrowedTag, implicitRole, context } = derived
    const { violations, fixes } = AriaPolicyEngine.#runRules(
      [...AriaPolicyEngine.#getRules(context), ...extraRules],
      context,
    )
    const next = AriaPolicyEngine.#applyFixes(narrowedTag, implicitRole, props, fixes)
    return { props: next, violations }
  }

  report(violations: ReadonlyArray<ValidationViolation>): void {
    for (const v of violations) {
      if (v.severity === 'error') this.violate(v.message)
      else this.warn(v.message)
    }
  }

  // Cache key covers only the aria-relevant subset of props (tag + role + aria-* attrs).
  // Non-aria props (className, onClick, etc.) do not affect ARIA decisions and are excluded
  // so cache hits survive re-renders that only change non-aria props.
  static #createPlanKey(tag: AnyTag, props: IntrinsicProps): string | null {
    if (typeof tag !== 'string') return null
    const parts: string[] = [tag]
    if (typeof props.role === 'string') parts.push(`role:${props.role}`)
    const ariaEntries: string[] = []
    for (const k in props) {
      if (Object.hasOwn(props, k) && k.startsWith('aria-'))
        ariaEntries.push(`${k}:${String(props[k])}`)
    }
    if (ariaEntries.length > 0) parts.push(...ariaEntries.sort())
    return parts.join('|')
  }

  static #computePlan(
    inputProps: IntrinsicProps,
    resultProps: IntrinsicProps,
  ): ReadonlySet<string> {
    const removals = new Set<string>()
    for (const key in inputProps) {
      if (Object.hasOwn(inputProps, key) && !(key in (resultProps as object))) removals.add(key)
    }
    return removals
  }

  static #applyPlan<T extends IntrinsicProps>(props: T, removals: ReadonlySet<string>): T {
    if (removals.size === 0) return props
    const next: Record<string, unknown> = {}
    for (const k in props) {
      if (Object.hasOwn(props, k) && !removals.has(k)) next[k] = props[k]
    }
    return next as unknown as T
  }

  validate(tag: AnyTag, props: IntrinsicProps): ValidationResult {
    const key = AriaPolicyEngine.#createPlanKey(tag, props)

    if (key !== null) {
      const cached = this.#planCache.get(key)
      if (cached !== undefined) {
        // Promote to MRU: delete + re-add moves key to Map insertion-order tail.
        this.#planCache.delete(key)
        this.#planCache.set(key, cached)
        if (cached.violations.length > 0) this.report(cached.violations as ValidationViolation[])
        return {
          props: AriaPolicyEngine.#applyPlan(props, cached.removals),
          violations: cached.violations as ValidationViolation[],
        }
      }
    }

    const result = this.#extraRules.length
      ? AriaPolicyEngine.#evaluateWithRules(tag, props, this.#extraRules)
      : AriaPolicyEngine.evaluate(tag, props)

    if (result.violations.length > 0) this.report(result.violations)

    if (key !== null) {
      const plan: AriaPlan = {
        removals: AriaPolicyEngine.#computePlan(props, result.props as IntrinsicProps),
        violations: result.violations,
      }
      this.#planCache.set(key, plan)
      if (this.#planCache.size > AriaPolicyEngine.#MAX_CACHE) {
        const lru = this.#planCache.keys().next().value
        if (lru !== undefined) this.#planCache.delete(lru)
      }
    }

    return result
  }

  static #hasRole(props: IntrinsicProps): props is PropsWithRole {
    return typeof props.role === 'string' && props.role.length > 0
  }

  static #applyFixes<T extends IntrinsicProps>(
    tag: IntrinsicTag,
    implicitRole: AriaContext['implicitRole'],
    props: T,
    fixes: Map<FixKind, AriaFix>,
  ): T {
    if (fixes.size === 0) return props
    const sorted = [...fixes.values()].sort(
      (a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity),
    )
    let next: IntrinsicProps = props
    for (const { apply } of sorted) {
      const effectiveRole = next.role ?? implicitRole
      const fixContext: AriaContext = { tag, implicitRole, effectiveRole, props: next }
      const fixResult = apply(fixContext)
      if (fixResult.applied) next = fixResult.next as IntrinsicProps
    }
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
      kind: `removeAttribute:${attr}`,
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
    AriaPolicyEngine.#checkInvalidAriaAttributes,
  ] as const satisfies readonly AriaRule[]

  static #checkInvalidRoleOverride({
    tag,
    props,
    implicitRole,
  }: AriaContext): readonly AriaResult[] {
    const role = props.role
    if (!implicitRole || !role || role === implicitRole) return VALID

    if (isStrongImplicitRole(tag) && role === 'region') {
      return [
        {
          valid: false,
          fixable: true,
          severity: 'error',
          fix: AriaPolicyEngine.#removeRole,
          message: `<${tag}> should not override its implicit role="${implicitRole}" with role="${role}".`,
        },
      ]
    }

    return VALID
  }

  static #checkRedundantRole({ tag, props, implicitRole }: AriaContext): readonly AriaResult[] {
    const role = props.role
    if (!implicitRole || !role || role !== implicitRole) return VALID

    return [
      {
        valid: false,
        fixable: true,
        severity: 'warning',
        fix: AriaPolicyEngine.#removeRole,
        message: `<${tag}> already has implicit role="${implicitRole}". Avoid redundant role assignment.`,
      },
    ]
  }

  static #checkStandaloneRegion({ tag, props, implicitRole }: AriaContext): readonly AriaResult[] {
    const role = props.role
    if (role !== 'region') return VALID
    if (!isStandaloneTag(tag)) return VALID

    return [
      {
        valid: false,
        fixable: true,
        severity: 'error',
        fix: AriaPolicyEngine.#removeRole,
        message: `<${tag}> is a self-contained element with implicit role="${implicitRole}". Assigning role="region" has been removed.`,
      },
    ]
  }

  static #checkInvalidAriaAttributes({
    tag,
    props,
    effectiveRole,
  }: AriaContext): readonly AriaResult[] {
    const results: AriaResult[] = []

    for (const key in props) {
      if (!Object.hasOwn(props, key)) continue
      if (!key.startsWith('aria-')) continue
      if (isGlobalAriaAttribute(key)) continue
      if (isAriaAttributeValidForRole(key, effectiveRole)) continue

      results.push({
        valid: false,
        severity: 'warning',
        fixable: true,
        attribute: key,
        message: `"${key}" is not valid on role="${effectiveRole ?? tag}". It will be removed.`,
        fix: AriaPolicyEngine.#makeRemoveAttributeFix(key),
      })
    }

    return results
  }
}
