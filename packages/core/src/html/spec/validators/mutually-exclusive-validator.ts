import type { AriaContext, AriaResult, AriaRule } from '../../../types'
import type { MutuallyExclusivePolicy } from '../types'

// Generic validator: turns a `MutuallyExclusivePolicy` fact ("these two props conflict") into a
// scoped `AriaRule`, so a new conflicting pair never requires writing another predicate.
export function createMutuallyExclusiveRule({
  props: conflictingProps,
  diagnostic: createDiagnostic,
}: MutuallyExclusivePolicy): AriaRule {
  const [first, second] = conflictingProps
  const rule = ({ tag, props }: AriaContext): readonly AriaResult[] => {
    if (tag !== 'input' || !props[first] || !props[second]) return []
    const diagnostic = createDiagnostic()
    return [{ valid: false, fixable: false, severity: diagnostic.severity, diagnostic }]
  }
  return Object.assign(rule, { readsProps: conflictingProps, tags: ['input'] as const })
}
