import { StrictBase } from '../base'
import type {
  AriaContext,
  AriaFix,
  AriaResult,
  AriaRule,
  ElementType,
  EvaluationContext,
  FixKind,
  IntrinsicProps,
  IntrinsicTag,
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

function isIntrinsicTag(tag: ElementType): tag is IntrinsicTag {
  return typeof tag === 'string'
}

function omitProp<T extends Readonly<Record<string, unknown>>, K extends keyof T>(
  obj: T,
  key: K,
): Omit<T, K> {
  const { [key]: _, ...rest } = obj
  return rest as Omit<T, K>
}

export class AriaPolicyEngine extends StrictBase {
  readonly #extraRules: readonly AriaRule[]

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

  static #deriveContext(tag: ElementType, props: IntrinsicProps): EvaluationContext {
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

  // Role rules only apply when an explicit role is present; attribute checks always run.
  static #getRules(context: AriaContext): readonly AriaRule[] {
    return AriaPolicyEngine.#hasRole(context.props)
      ? AriaPolicyEngine.#pipeline
      : [AriaPolicyEngine.#checkInvalidAriaAttributes]
  }

  // No side effects or logging; result is fully determined by (tag, props) + module-level policy maps.
  static evaluate(tag: ElementType, props: IntrinsicProps): ValidationResult {
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

  // Like evaluate() but appends extra rules after the default pipeline.
  static #evaluateWithRules(
    tag: ElementType,
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

  validate(tag: ElementType, props: IntrinsicProps): ValidationResult {
    const result = this.#extraRules.length
      ? AriaPolicyEngine.#evaluateWithRules(tag, props, this.#extraRules)
      : AriaPolicyEngine.evaluate(tag, props)
    this.report(result.violations)
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
    // Lower priority number runs first; undefined priority runs last.
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
    return {
      kind: `removeAttribute:${attr}`,
      apply: ({ props }) => {
        if (!(attr in props)) return { applied: false, next: props }
        return { applied: true, next: omitProp(props, attr), previous: props }
      },
    }
  }

  // Snapshot diagnostic model: all rules evaluate against the same (tag, props, implicitRole) snapshot.
  // Violations reflect pre-fix state; callers receive both the original diagnostics and the transformed props.
  // Fixes are deduplicated by kind — at most one executor per FixKind runs regardless of how many rules emit it.
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

    for (const key of Object.keys(props)) {
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
