import { iterate } from '@praxis-kit/primitive'
import type { AnyRecord, ElementType, IntrinsicTag } from '@praxis-kit/shared'
import { isNull, isNumber, isString } from '@praxis-kit/shared'
import { InvariantBase } from '../strict'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import { AriaDiagnostics, HtmlDiagnostics } from '../diagnostics'
import type {
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
import { isAriaAttributeValidForRole, isGlobalAriaAttribute } from './aria-attribute-policy'
import { getImplicitRole, isStandaloneTag, isStrongImplicitRole } from './aria-role-policy'

export { isInvalid } from '@praxis-kit/shared'

const VALID = [{ valid: true }] as const

// Broader than ElementType: accepts component functions so adapters can pass the `as` prop directly.
type AnyTag = ElementType | ((...args: unknown[]) => unknown)

function isIntrinsicTag(tag: AnyTag): tag is IntrinsicTag {
  return isString(tag)
}

function omitProp<T extends Readonly<AnyRecord>, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const { [key]: _, ...rest } = obj
  return rest as Omit<T, K>
}

export class AriaPolicyEngine extends InvariantBase {
  readonly #extraRules: readonly AriaRule[]
  readonly #planCache = new Map<string, AriaPlan>()
  static readonly #MAX_CACHE = 100
  // Memoized AriaFix objects keyed by attribute name — the ARIA attribute set is
  // finite so this Map is bounded and avoids recreating closures on every cache miss.
  static readonly #removeAttributeFixCache = new Map<string, AriaFix>()

  constructor(diagnostics: Diagnostics, options?: { rules?: readonly AriaRule[] }) {
    super(diagnostics)
    this.#extraRules = options?.rules ?? []
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
            severity: 'warning',
            phase: 'evaluate',
          },
        ],
      },
    }
  }

  static #deriveContext(tag: AnyTag, props: IntrinsicProps): EvaluationContext {
    if (!isIntrinsicTag(tag)) return { proceed: false, result: { props, violations: [] } }
    const implicitRole = getImplicitRole(tag, props)
    // Also proceed for explicit live-region roles on tags with no implicit role (e.g. <div role="alert">).
    const hasExplicitLiveRole =
      !implicitRole && AriaPolicyEngine.#LIVE_REGION_ROLES.has(props.role ?? '')
    if (!implicitRole && !hasExplicitLiveRole)
      return { proceed: false, result: { props, violations: [] } }

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
  ): { violations: ValidationViolation[]; fixes: AriaFix[] } {
    const violations: ValidationViolation[] = []
    const fixes: AriaFix[] = []

    iterate.forEach(rules, (rule) => {
      iterate.forEach(rule(context), (result) => {
        if (result.valid) return

        const {
          tag,
          props: { role },
        } = context
        const { message, attribute, severity } = result
        const resolvedMessage = message ?? result.diagnostic?.message
        const fallbackDiag =
          resolvedMessage == null ? AriaDiagnostics.invalidRole(role, tag) : undefined
        violations.push({
          message: resolvedMessage ?? fallbackDiag!.message,
          tag,
          role,
          attribute,
          severity,
          phase: 'evaluate',
          ...(result.diagnostic != null && { diagnostic: result.diagnostic }),
          ...(fallbackDiag != null && { diagnostic: fallbackDiag }),
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
      (context.effectiveRole != null &&
        AriaPolicyEngine.#LIVE_REGION_ROLES.has(context.effectiveRole))
    ) {
      return AriaPolicyEngine.#pipeline
    }
    return [AriaPolicyEngine.#checkInvalidAriaAttributes]
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
    iterate.forEach(violations, (v) => {
      const d = v.diagnostic ?? AriaDiagnostics.fromViolation(v)
      if (v.severity === 'error') this.violate(d)
      else this.warn(d)
    })
  }

  // Cache key covers only the aria-relevant subset of props (tag + role + aria-* attrs).
  // Non-aria props (className, onClick, etc.) do not affect ARIA decisions and are excluded
  // so cache hits survive re-renders that only change non-aria props.
  // Note: #extraRules are NOT included in the key — each engine instance has its own Map,
  // so two engines with different rules never share cache entries. If caching ever becomes
  // static/shared, rule identity would need to be folded into the key.
  static #createPlanKey(tag: AnyTag, props: IntrinsicProps): string | null {
    if (!isIntrinsicTag(tag)) return null
    const parts: string[] = [tag]
    if (typeof props.role === 'string') parts.push(`role:${props.role}`)
    // input's implicit role depends on type — include it so different types never share a cache entry
    if (tag === 'input' && typeof props.type === 'string') parts.push(`type:${props.type}`)
    const ariaEntries: string[] = []
    iterate.forEachEntry(props, (k, v) => {
      if (!k.startsWith('aria-')) return
      // Skip non-primitive values — String([object Object]) would produce colliding keys.
      if (!isString(v) && !isNumber(v) && typeof v !== 'boolean') return
      ariaEntries.push(`${k}:${String(v)}`)
    })
    if (ariaEntries.length > 0) parts.push(...ariaEntries.sort())
    return parts.join('|')
  }

  static #computePlan(
    inputProps: IntrinsicProps,
    resultProps: IntrinsicProps,
  ): { removals: ReadonlySet<string>; updates: Readonly<AnyRecord> } {
    const removals = new Set<string>()
    const updates: AnyRecord = {}
    iterate.forEachKey(inputProps, (key) => {
      if (!(key in (resultProps as object))) removals.add(key)
    })
    iterate.forEachEntry(resultProps, (key, resultVal) => {
      // Capture both new keys (additions) and changed values (modifications).
      if ((inputProps as AnyRecord)[key] !== resultVal) updates[key] = resultVal
    })
    return { removals, updates }
  }

  static #applyPlan<T extends IntrinsicProps>(
    props: T,
    removals: ReadonlySet<string>,
    updates: Readonly<AnyRecord>,
  ): T {
    const hasRemovals = removals.size > 0
    const hasUpdates = Object.keys(updates).length > 0
    if (!hasRemovals && !hasUpdates) return props
    const next: AnyRecord = {}
    iterate.forEachEntry(props, (k, v) => {
      if (!removals.has(k)) next[k] = v
    })
    Object.assign(next, updates)
    return next as unknown as T
  }

  validate(tag: AnyTag, props: IntrinsicProps): ValidationResult {
    const key = AriaPolicyEngine.#createPlanKey(tag, props)

    if (!isNull(key)) {
      const cached = this.#planCache.get(key)
      if (cached !== undefined) {
        // Promote to MRU: delete + re-add moves key to Map insertion-order tail.
        this.#planCache.delete(key)
        this.#planCache.set(key, cached)
        if (cached.violations.length > 0) this.report(cached.violations as ValidationViolation[])
        return {
          props: AriaPolicyEngine.#applyPlan(props, cached.removals, cached.updates),
          violations: cached.violations as ValidationViolation[],
        }
      }
    }

    const result = this.#extraRules.length
      ? AriaPolicyEngine.#evaluateWithRules(tag, props, this.#extraRules)
      : AriaPolicyEngine.evaluate(tag, props)

    if (result.violations.length > 0) this.report(result.violations)

    if (!isNull(key)) {
      const { removals, updates } = AriaPolicyEngine.#computePlan(
        props,
        result.props as IntrinsicProps,
      )
      const plan: AriaPlan = { removals, updates, violations: result.violations }
      this.#planCache.set(key, plan)
      if (this.#planCache.size > AriaPolicyEngine.#MAX_CACHE) {
        const lru = this.#planCache.keys().next().value
        if (lru !== undefined) this.#planCache.delete(lru)
      }
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
  ): T {
    if (fixes.length === 0) return props
    const sorted = [...fixes].sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity))
    let next: IntrinsicProps = props
    iterate.forEach(sorted, ({ apply }) => {
      const effectiveRole = next.role ?? implicitRole
      const fixContext: AriaContext = { tag, implicitRole, effectiveRole, props: next }
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
    AriaPolicyEngine.#checkMissingLiveRegion,
    AriaPolicyEngine.#checkMissingAtomic,
    AriaPolicyEngine.#checkInvalidAriaRelevant,
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
          diagnostic: HtmlDiagnostics.implicitRoleOverride(tag, implicitRole, role),
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
        diagnostic: HtmlDiagnostics.implicitRoleRedundant(tag, implicitRole),
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
        diagnostic: HtmlDiagnostics.standaloneRegionOverride(tag, implicitRole ?? tag),
      },
    ]
  }

  static #checkInvalidAriaAttributes({
    tag,
    props,
    effectiveRole,
  }: AriaContext): readonly AriaResult[] {
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

  // WAI-ARIA live region roles and their implied aria-live politeness values.
  static readonly #LIVE_REGION_ROLES: ReadonlyMap<string, string> = new Map([
    ['alert', 'assertive'],
    ['status', 'polite'],
    ['log', 'polite'],
    ['timer', 'off'],
  ])

  static #checkMissingLiveRegion({ effectiveRole, props }: AriaContext): readonly AriaResult[] {
    if (!effectiveRole) return VALID
    const impliedLive = AriaPolicyEngine.#LIVE_REGION_ROLES.get(effectiveRole)
    if (!impliedLive) return VALID
    if ('aria-live' in props) return VALID

    const injectLive: AriaFix = {
      kind: `injectLive:${effectiveRole}`,
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

  static #checkMissingAtomic({ effectiveRole, props }: AriaContext): readonly AriaResult[] {
    if (!effectiveRole || !AriaPolicyEngine.#LIVE_REGION_ROLES.has(effectiveRole)) return VALID
    if ('aria-atomic' in props) return VALID

    return [
      {
        valid: false,
        fixable: false,
        severity: 'warning',
        diagnostic: AriaDiagnostics.missingAtomic(effectiveRole),
      },
    ]
  }

  static readonly #VALID_RELEVANT_TOKENS = new Set(['additions', 'removals', 'text', 'all'])

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
    if (relevant === undefined) return VALID
    if (typeof relevant !== 'string') return VALID

    const tokens = relevant.trim().split(/\s+/)
    const invalid = tokens.filter((t) => !AriaPolicyEngine.#VALID_RELEVANT_TOKENS.has(t))
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

    return VALID
  }
}
