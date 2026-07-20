import type { AriaContext, AriaFix, AriaResult, AriaRule } from '../types'
import { AriaDiagnostics, HtmlDiagnostics } from '@praxis-kit/contract'
import { INPUT_RULES } from './input-rules'
import { roleNotPermittedRule } from './role-restrictions'

const LANDMARK_TAG_SET = new Set(['article', 'aside', 'footer', 'header', 'main', 'nav'])

const removeLandmarkRoleOverride: AriaFix = {
  kind: 'removeRole',
  apply: ({ props }) => {
    if (!('role' in props)) return { applied: false, next: props }
    const { role: _r, ...rest } = props
    return { applied: true, next: rest, previous: props }
  },
}

export function landmarkRoleRule({ tag, props, implicitRole }: AriaContext): readonly AriaResult[] {
  if (!LANDMARK_TAG_SET.has(tag) || !implicitRole) return []
  const role = props.role
  // role === implicitRole is already caught by the built-in #checkRedundantRole (warns, removes).
  if (!role || role === implicitRole) return []
  const diagnostic = HtmlDiagnostics.landmarkRoleOverride(tag, implicitRole, role)
  return [
    {
      valid: false,
      fixable: true,
      severity: diagnostic.severity,
      fix: removeLandmarkRoleOverride,
      diagnostic,
    },
  ]
}

// WAI-ARIA APG — elements that must have an accessible name to be usable by
// assistive technology. The check fires when neither aria-label nor aria-labelledby
// is present on the element.
// Reference: https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/
export function requireAccessibleName({ tag, props }: AriaContext): readonly AriaResult[] {
  if ('aria-label' in props || 'aria-labelledby' in props) return []
  return [
    {
      valid: false,
      fixable: false,
      severity: 'warning',
      diagnostic: AriaDiagnostics.missingAccessibleName(tag),
    },
  ]
}

// nav and aside are commonly multiplied on a single page (primary nav, breadcrumb nav;
// main content, sidebar) and each instance must have a unique accessible name so that
// screen reader users can distinguish them from the landmarks list.
// WAI-ARIA APG: https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/
const NAMED_LANDMARK_TAGS = new Set(['nav', 'aside'])

export function landmarkNameAdvisory(ctx: AriaContext): readonly AriaResult[] {
  if (!ctx.implicitRole || !NAMED_LANDMARK_TAGS.has(ctx.tag)) return []
  return requireAccessibleName(ctx)
}

export const HTML_ARIA_RULES: readonly AriaRule[] = [
  landmarkRoleRule,
  landmarkNameAdvisory,
  roleNotPermittedRule,
  ...INPUT_RULES,
]
