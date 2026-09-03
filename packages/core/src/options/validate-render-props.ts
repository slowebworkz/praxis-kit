import type { AnyRecord, VariantMap } from '../types'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import { iterate } from '@praxis-kit/primitive'
import { ContractDiagnostics } from '@praxis-kit/contract'

type ValidateOptions = {
  readonly recipeMap?: Readonly<AnyRecord>
  readonly variants?: Readonly<VariantMap>
  readonly displayName?: string
}

function label(name?: string): string {
  return name ? `[${name}]` : '[createContractComponent]'
}

export function validateRenderProps(
  diagnostics: Diagnostics,
  options: ValidateOptions,
  props: AnyRecord,
  recipeKey: string | undefined,
): void {
  const { recipeMap, variants, displayName } = options
  const tag = label(displayName)

  if (recipeKey !== undefined && (!recipeMap || !Object.hasOwn(recipeMap, recipeKey))) {
    diagnostics.error(ContractDiagnostics.unknownRecipeKey(tag, recipeKey))
  }

  if (variants) {
    iterate.forEachKey(variants, (key) => {
      if (!Object.hasOwn(props, key)) return
      const value = props[key]
      if (value === undefined || value === null) return
      const dim = variants[key]
      if (dim && !Object.hasOwn(dim, String(value))) {
        diagnostics.error(ContractDiagnostics.invalidVariantValue(tag, key, String(value)))
      }
    })
  }
}
