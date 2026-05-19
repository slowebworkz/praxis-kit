import { StrictBase } from '../base'
import type {
  AriaContext,
  AriaFix,
  AriaFixResult,
  AriaResult,
  AriaRule,
  FixKind,
  IntrinsicProps,
  IntrinsicTag,
  InvalidResult,
  PropsWithRole,
  StrictMode,
  ValidationResult,
  ValidationViolation,
} from '../types'
import { getImplicitRole, isStandaloneTag, isStrongImplicitRole } from './aria-role-policy'

export function isInvalid(result: AriaResult): result is InvalidResult {
  return result.valid === false
}

export class AriaPolicyEngine extends StrictBase {
  constructor(strict: StrictMode = 'warn') {
    super(strict)
  }

  // No side effects or logging; result is fully determined by (tag, props) + module-level policy maps.
  static evaluate(tag: unknown, props: IntrinsicProps): ValidationResult {
    if (!AriaPolicyEngine.#hasImplicitRole(tag)) return { props, violations: [] }

    const implicitRole = getImplicitRole(tag)
    const violations: ValidationViolation[] = []

    if (!AriaPolicyEngine.#hasRole(props)) {
      if (props.role === '') {
        violations.push({
          message: `<${tag}> has an explicit empty role="". Omit the attribute instead.`,
          tag,
          role: '',
          attribute: undefined,
          severity: 'warning',
          phase: 'evaluate',
        })
        const { role: _, ...rest } = props
        return { props: rest as IntrinsicProps, violations }
      }
      return { props, violations }
    }

    const pendingFixes = new Map<FixKind, AriaFix>()

    for (const rule of AriaPolicyEngine.#pipeline) {
      const effectiveRole = (props.role as string | undefined) ?? implicitRole
      const context: AriaContext = { tag, props, implicitRole, effectiveRole }
      for (const result of rule(context)) {
        if (!result.valid) {
          const role = props.role
          const message = result.message ?? `Invalid role "${role}" on <${tag}>`
          violations.push({
            message,
            tag,
            role,
            attribute: undefined,
            severity: result.severity,
            phase: 'evaluate',
          })
          if (result.fixable) pendingFixes.set(result.fix.kind, result.fix)
        }
      }
    }

    const { next } = AriaPolicyEngine.#applyFixes(tag, implicitRole, props, pendingFixes)
    return { props: next as IntrinsicProps, violations }
  }

  report(violations: ReadonlyArray<ValidationViolation>): void {
    for (const v of violations) {
      if (v.severity === 'error') this.violate(v.message)
      else this.warn(v.message)
    }
  }

  validate(tag: unknown, props: IntrinsicProps): ValidationResult {
    const result = AriaPolicyEngine.evaluate(tag, props)
    this.report(result.violations)
    return result
  }

  static #hasImplicitRole(tag: unknown): tag is IntrinsicTag {
    return typeof tag === 'string' && getImplicitRole(tag as IntrinsicTag) !== undefined
  }

  static #hasRole(props: IntrinsicProps): props is PropsWithRole {
    return typeof props.role === 'string' && props.role.length > 0
  }

  static #applyFixes(
    tag: IntrinsicTag,
    implicitRole: AriaContext['implicitRole'],
    props: IntrinsicProps,
    fixes: Map<FixKind, AriaFix>,
  ): AriaFixResult {
    if (fixes.size === 0) return { applied: false, next: props }
    let next: IntrinsicProps = props
    let applied = false
    for (const { apply } of fixes.values()) {
      if (!AriaPolicyEngine.#hasRole(next)) break
      const effectiveRole = (next.role as string | undefined) ?? implicitRole
      const fixContext: AriaContext = { tag, implicitRole, effectiveRole, props: next }
      const fixResult = apply(fixContext)
      if (fixResult.applied) {
        next = fixResult.next as IntrinsicProps
        applied = true
      }
    }
    return applied ? { applied: true, next, previous: props } : { applied: false, next: props }
  }

  static readonly #removeRole: AriaFix = {
    kind: 'removeRole',
    apply: ({ props }) => {
      if (!('role' in props)) return { applied: false, next: props }
      const { role: _, ...rest } = props
      return { applied: true, next: rest as IntrinsicProps, previous: props }
    },
  }

  // Snapshot diagnostic model: all rules evaluate against the same (tag, props, implicitRole) snapshot.
  // Violations reflect pre-fix state; callers receive both the original diagnostics and the transformed props.
  // Fixes are deduplicated by kind — at most one executor per FixKind runs regardless of how many rules emit it.
  static readonly #pipeline = [
    AriaPolicyEngine.#checkInvalidRoleOverride,
    AriaPolicyEngine.#checkRedundantRole,
    AriaPolicyEngine.#checkStandaloneRegion,
  ] as const satisfies readonly AriaRule[]

  static #checkInvalidRoleOverride({
    tag,
    props,
    implicitRole,
  }: AriaContext): readonly AriaResult[] {
    const role = props.role
    if (!implicitRole || !role || role === implicitRole) return [{ valid: true }]

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

    return [{ valid: true }]
  }

  static #checkRedundantRole({ tag, props, implicitRole }: AriaContext): readonly AriaResult[] {
    const role = props.role
    if (!implicitRole || !role || role !== implicitRole) return [{ valid: true }]

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
    if (role !== 'region') return [{ valid: true }]
    if (!isStandaloneTag(tag)) return [{ valid: true }]

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
}
