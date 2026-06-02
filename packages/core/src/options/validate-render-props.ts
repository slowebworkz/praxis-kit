import type { AnyRecord } from '../types/primitives'
import type { StrictMode } from '../types/strict-mode'
import type { VariantMap } from '../types/variant'

type Options = {
  readonly presetMap?: Readonly<Record<string, unknown>>
  readonly variants?: Readonly<VariantMap>
  readonly variantKeys: ReadonlySet<string>
  readonly strict: StrictMode
  readonly displayName?: string
}

function report(strict: StrictMode, message: string): void {
  if (!strict) return
  if (strict === true || strict === 'throw') throw new Error(message)
  console.warn(message)
}

function label(name?: string): string {
  return name ? `[${name}]` : '[createContractComponent]'
}

export function validateRenderProps(
  options: Options,
  props: AnyRecord,
  variantKey: string | undefined,
): void {
  const { strict, presetMap, variants, variantKeys, displayName } = options
  if (!strict) return

  const tag = label(displayName)

  // Unknown variantKey — names no defined preset.
  if (variantKey !== undefined && (!presetMap || !(variantKey in presetMap))) {
    report(strict, `${tag} Unknown variantKey "${variantKey}" — no preset with that name exists.`)
  }

  // Undefined variant value — prop key is a known variant dimension but the value
  // is not a defined variant value for that dimension.
  if (variants) {
    for (const key of variantKeys) {
      if (!(key in props)) continue
      const value = props[key]
      if (value === undefined || value === null) continue
      const dim = variants[key]
      if (dim && !(String(value) in dim)) {
        report(
          strict,
          `${tag} Variant "${key}=${String(value)}" is not a defined value for the "${key}" dimension.`,
        )
      }
    }
  }
}
