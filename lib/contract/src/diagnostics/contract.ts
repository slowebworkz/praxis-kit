import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'

export const ContractDiagnostics = {
  unexpectedChild(typeName: string, index: number, context: string): DiagnosticInput {
    return {
      code: DiagnosticCode.UnexpectedChild,
      category: DiagnosticCategory.Contract,
      component: context,
      message: `${context}: unexpected child "${typeName}" at index ${index}.`,
    }
  },

  ambiguousChild(
    typeName: string,
    index: number,
    ruleNames: string[],
    context: string,
  ): DiagnosticInput {
    const quoted = ruleNames.map((n) => `"${n}"`).join(' and ')
    return {
      code: DiagnosticCode.AmbiguousChild,
      category: DiagnosticCategory.Contract,
      component: context,
      message: `${context}: child "${typeName}" at index ${index} matches multiple child rules: ${quoted}.`,
    }
  },

  cardinalityMin(ruleName: string, min: number, context: string): DiagnosticInput {
    return {
      code: DiagnosticCode.CardinalityMin,
      category: DiagnosticCategory.Contract,
      component: context,
      message: `${context}: "${ruleName}" requires at least ${min}.`,
    }
  },

  cardinalityMax(ruleName: string, max: number, context: string): DiagnosticInput {
    return {
      code: DiagnosticCode.CardinalityMax,
      category: DiagnosticCategory.Contract,
      component: context,
      message: `${context}: "${ruleName}" allows at most ${max}.`,
    }
  },

  positionViolation(
    ruleName: string,
    position: string,
    index: number,
    context: string,
  ): DiagnosticInput {
    return {
      code: DiagnosticCode.PositionViolation,
      category: DiagnosticCategory.Contract,
      component: context,
      message: `${context}: "${ruleName}" must be ${position}, got index ${index}`,
    }
  },

  unknownVariantDim(component: string, label: string, dim: string): DiagnosticInput {
    return {
      code: DiagnosticCode.ContractUnknownVariantDim,
      category: DiagnosticCategory.Contract,
      message: `${component}: ${label} references unknown variant "${dim}".`,
    }
  },

  unknownVariantValue(
    component: string,
    label: string,
    dim: string,
    value: string,
    valid: string[],
  ): DiagnosticInput {
    return {
      code: DiagnosticCode.ContractUnknownVariantValue,
      category: DiagnosticCategory.Contract,
      message: `${component}: ${label} sets "${dim}" to unknown value "${value}" (valid: ${valid.join(', ')}).`,
    }
  },

  unknownRecipeKey(component: string, key: string): DiagnosticInput {
    return {
      code: DiagnosticCode.ContractUnknownRecipeKey,
      category: DiagnosticCategory.Contract,
      message: `${component} Unknown recipeKey "${key}" — no preset with that name exists.`,
    }
  },

  invalidVariantValue(component: string, key: string, value: string): DiagnosticInput {
    return {
      code: DiagnosticCode.ContractInvalidVariantValue,
      category: DiagnosticCategory.Contract,
      message: `${component} Variant "${key}=${value}" is not a defined value for the "${key}" dimension.`,
    }
  },

  allowedAsViolation(
    tag: string,
    allowedAs: readonly unknown[],
    component: string,
  ): DiagnosticInput {
    const allowed = allowedAs.map((t) => `"${String(t)}"`).join(', ')
    return {
      code: DiagnosticCode.AllowedAsViolation,
      category: DiagnosticCategory.Contract,
      component,
      message: `<${component}>: "as" prop received "${tag}" but only [${allowed}] are allowed.`,
    }
  },
}
