import type { AriaContext, AriaResult, AriaRule } from '../../../types'
import type { MutuallyExclusivePolicy } from '../types'

// Generic validator: turns a `MutuallyExclusivePolicy` fact ("these two props conflict") into a
// scoped `AriaRule`, so a new conflicting pair never requires writing another predicate.
// An HTML boolean attribute is "on" whenever it is present with any value other than an explicit
// `false` / nullish — `required` (bare), `required=""`, `required="required"` all count, only
// `required={false}` / absent do not. Truthiness alone would miss the string-attribute forms.
function isBooleanAttrSet(value: unknown): boolean {
  return value !== undefined && value !== null && value !== false
}

export function createMutuallyExclusiveRule({
  props: conflictingProps,
  diagnostic: createDiagnostic,
}: MutuallyExclusivePolicy): AriaRule {
  const [first, second] = conflictingProps
  const rule = ({ tag, props }: AriaContext): readonly AriaResult[] => {
    if (tag !== 'input' || !isBooleanAttrSet(props[first]) || !isBooleanAttrSet(props[second]))
      return []
    const diagnostic = createDiagnostic()
    return [{ valid: false, fixable: false, severity: diagnostic.severity, diagnostic }]
  }
  return Object.assign(rule, { readsProps: conflictingProps, tags: ['input'] as const })
}
