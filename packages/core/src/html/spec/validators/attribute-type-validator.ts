import type { AnyRecord } from '@praxis-kit/primitive'
import type { AriaContext, AriaFix, AriaResult, AriaRule } from '../../../types'
import { HtmlDiagnostics } from '@praxis-kit/contract'
import type { InputAttributeTypePolicy } from '../attributes/input'

const DEFAULT_INPUT_TYPE = 'text'

function omit<T extends AnyRecord>(props: T, key: string): T {
  const next = { ...props } as AnyRecord
  delete next[key]
  return next as T
}

function removeAttributeFix(attribute: string): AriaFix {
  return {
    kind: `removeAttribute:${attribute}` as const,
    apply: ({ props }) => {
      if (!(attribute in props)) return { applied: false, next: props }
      return { applied: true, next: omit(props, attribute), previous: props }
    },
  }
}

// Generic validator: turns an `InputAttributeTypePolicy` fact ("this attribute only applies to
// these input types") into a scoped, cache-friendly `AriaRule`, so adding a new policy entry never
// requires writing another predicate.
export function createInputAttributeTypeRule({
  attribute,
  allowedTypes,
}: InputAttributeTypePolicy): AriaRule {
  const rule = ({ tag, props }: AriaContext): readonly AriaResult[] => {
    if (tag !== 'input' || !(attribute in props)) return []
    const type = typeof props.type === 'string' ? props.type : DEFAULT_INPUT_TYPE
    if (allowedTypes.includes(type)) return []
    const diagnostic = HtmlDiagnostics.input.attributeIgnoredForType(attribute, type, allowedTypes)
    return [
      {
        valid: false,
        fixable: true,
        severity: diagnostic.severity,
        fix: removeAttributeFix(attribute),
        diagnostic,
      },
    ]
  }
  return Object.assign(rule, { readsProps: ['type', attribute] as const })
}
