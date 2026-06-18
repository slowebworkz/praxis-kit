import type { AriaContext, AriaFix, AriaResult, AriaRule } from '../types'

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
  return [
    {
      valid: false,
      fixable: true,
      severity: 'error',
      fix: removeLandmarkRoleOverride,
      message: `<${tag}> has a fixed landmark role="${implicitRole}". role="${role}" overrides it and confuses assistive technology. The override has been removed.`,
    },
  ]
}

export const HTML_ARIA_RULES: readonly AriaRule[] = [landmarkRoleRule]
