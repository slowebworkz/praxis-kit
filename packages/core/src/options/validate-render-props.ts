import type { AnyRecord } from '../types/primitives'
import type { StrictMode } from '../types/strict-mode'
import type { VariantMap } from '../types/variant'

type Options = {
  readonly presetMap?: Readonly<Record<string, unknown>>
  readonly variants?: Readonly<VariantMap>
  readonly strict: StrictMode
  readonly displayName?: string
}

// Module-level dedupe cache — dev-only, so the memory cost is negligible.
// Prevents identical warnings from flooding the console across repeated renders.
const warned = new Set<string>()

function report(strict: StrictMode, message: string): void {
  if (!strict) return
  if (strict === true || strict === 'throw') throw new Error(message)
  if (warned.has(message)) return
  warned.add(message)
  console.warn(message)
}

function label(name?: string): string {
  return name ? `[${name}]` : '[createContractComponent]'
}

export function validateRenderProps(
  options: Options,
  props: AnyRecord,
  presetKey: string | undefined,
): void {
  const { strict, presetMap, variants, displayName } = options
  if (!strict) return

  const tag = label(displayName)

  // Unknown presetKey — names no defined preset.
  if (presetKey !== undefined && (!presetMap || !Object.hasOwn(presetMap, presetKey))) {
    report(strict, `${tag} Unknown presetKey "${presetKey}" — no preset with that name exists.`)
  }

  // Undefined variant value — prop key is a known variant dimension but the value
  // is not a defined variant value for that dimension.
  if (variants) {
    for (const key in variants) {
      if (!Object.hasOwn(props, key)) continue
      const value = props[key]
      if (value === undefined || value === null) continue
      const dim = variants[key]
      if (dim && !Object.hasOwn(dim, String(value))) {
        report(
          strict,
          `${tag} Variant "${key}=${String(value)}" is not a defined value for the "${key}" dimension.`,
        )
      }
    }
  }
}

/** Clears the dedupe cache. Exposed for test isolation only. */
export function _resetWarned(): void {
  warned.clear()
}
