import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import type { ElementType } from '@praxis-kit/primitive'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'
import { isDefined, isString } from '@praxis-kit/guards'

/**
 * Renders an `ElementType` for a diagnostic message. A plain `String(tag)` works fine for the
 * tag-name-string case but, for a component reference (the `as`/`allowedAs` component-reference
 * feature), prints the entire function/class source into the message — a confusing, often huge
 * diagnostic. Prefers a component's `displayName`/`name`, falling back to a generic placeholder
 * rather than ever stringifying the reference itself.
 */
export function describeElementType(tag: ElementType): string {
  if (isString(tag)) return tag
  const named = tag as { displayName?: string; name?: string }
  return named.displayName ?? named.name ?? '[component]'
}

// Facts only — the text for each code lives in a message catalog; see `aria.ts`.
function contract(
  code: DiagnosticCode,
  context: Readonly<Record<string, unknown>>,
  component?: string,
  messageId?: string,
): DiagnosticInput {
  return {
    code,
    category: DiagnosticCategory.Contract,
    ...(isDefined(component) && { component }),
    context,
    ...(isDefined(messageId) && { messageId }),
  }
}

export const ContractDiagnostics = {
  // `scope` is the component or element the children belong to, for example `<ul>` or `Menu`.
  unexpectedChild(typeName: string, index: number, scope: string): DiagnosticInput {
    return contract(DiagnosticCode.UnexpectedChild, { typeName, index, scope }, scope)
  },

  ambiguousChild(
    typeName: string,
    index: number,
    ruleNames: string[],
    scope: string,
  ): DiagnosticInput {
    return contract(DiagnosticCode.AmbiguousChild, { typeName, index, ruleNames, scope }, scope)
  },

  cardinalityMin(ruleName: string, min: number, scope: string): DiagnosticInput {
    return contract(DiagnosticCode.CardinalityMin, { ruleName, min, scope }, scope)
  },

  cardinalityMax(ruleName: string, max: number, scope: string): DiagnosticInput {
    return contract(DiagnosticCode.CardinalityMax, { ruleName, max, scope }, scope)
  },

  // `first` and `last` are message ids (`COMP1008.first`, `COMP1008.last`), not a context value, so a
  // translation says "first" or "last" in its own words instead of splicing an English one in.
  positionViolation(
    ruleName: string,
    position: 'first' | 'last',
    index: number,
    scope: string,
  ): DiagnosticInput {
    return contract(
      DiagnosticCode.PositionViolation,
      { ruleName, index, scope },
      scope,
      `COMP1008.${position}`,
    )
  },

  unknownVariantDim(component: string, label: string, dim: string): DiagnosticInput {
    return contract(DiagnosticCode.ContractUnknownVariantDim, { component, label, dim })
  },

  unknownVariantValue(
    component: string,
    label: string,
    dim: string,
    value: string,
    valid: string[],
  ): DiagnosticInput {
    return contract(DiagnosticCode.ContractUnknownVariantValue, {
      component,
      label,
      dim,
      value,
      valid,
    })
  },

  unknownRecipeKey(component: string, key: string): DiagnosticInput {
    return contract(DiagnosticCode.ContractUnknownRecipeKey, { component, key })
  },

  invalidVariantValue(component: string, key: string, value: string): DiagnosticInput {
    return contract(DiagnosticCode.ContractInvalidVariantValue, { component, key, value })
  },

  allowedAsViolation(
    tag: ElementType,
    allowedAs: readonly ElementType[],
    component: string,
  ): DiagnosticInput {
    return contract(
      DiagnosticCode.AllowedAsViolation,
      { component, tag: describeElementType(tag), allowedAs: allowedAs.map(describeElementType) },
      component,
    )
  },
}
