import type { AnyRecord, StrictMode, VariantMap } from '../types'
import { iterate } from '@praxis-kit/primitive'
import { diagnosticsFromStrictMode } from '@praxis-kit/contract'
import { DiagnosticCategory, DiagnosticCode } from '@praxis-kit/diagnostics'

type Options = {
  readonly recipeMap?: Readonly<AnyRecord>
  readonly variants?: Readonly<VariantMap>
  readonly strict: StrictMode
  readonly displayName?: string
}

// Dedupe caches — dev-only, negligible memory cost.
const warned = new Set<string>()
const pendingAsyncWarns = new Set<string>()
let asyncWarnScheduled = false

function flushAsyncWarns(): void {
  asyncWarnScheduled = false
  const messages = [...pendingAsyncWarns]
  pendingAsyncWarns.clear()
  // Flush is already in the microtask — use sync reporter to emit immediately.
  const d = diagnosticsFromStrictMode('warn')
  iterate.forEach(messages, (msg) => {
    d.warn({
      code: DiagnosticCode.InternalError,
      category: DiagnosticCategory.Contract,
      message: msg,
    })
  })
}

function report(strict: StrictMode, message: string): void {
  if (!strict) return
  if (strict === true || strict === 'throw') {
    diagnosticsFromStrictMode(strict).error({
      code: DiagnosticCode.InternalError,
      category: DiagnosticCategory.Contract,
      message,
    })
    return
  }
  if (strict === 'async-warn') {
    if (pendingAsyncWarns.has(message)) return
    pendingAsyncWarns.add(message)
    if (!asyncWarnScheduled) {
      asyncWarnScheduled = true
      queueMicrotask(flushAsyncWarns)
    }
    return
  }
  if (warned.has(message)) return
  warned.add(message)
  diagnosticsFromStrictMode('warn').warn({
    code: DiagnosticCode.InternalError,
    category: DiagnosticCategory.Contract,
    message,
  })
}

function label(name?: string): string {
  return name ? `[${name}]` : '[createContractComponent]'
}

export function validateRenderProps(
  options: Options,
  props: AnyRecord,
  recipeKey: string | undefined,
): void {
  const { strict, recipeMap, variants, displayName } = options
  if (!strict) return

  const tag = label(displayName)

  // Unknown recipeKey — names no defined preset.
  if (recipeKey !== undefined && (!recipeMap || !Object.hasOwn(recipeMap, recipeKey))) {
    report(strict, `${tag} Unknown recipeKey "${recipeKey}" — no preset with that name exists.`)
  }

  // Undefined variant value — prop key is a known variant dimension but the value
  // is not a defined variant value for that dimension.
  if (variants) {
    iterate.forEachKey(variants, (key) => {
      if (!Object.hasOwn(props, key)) return
      const value = props[key]
      if (value === undefined || value === null) return
      const dim = variants[key]
      if (dim && !Object.hasOwn(dim, String(value))) {
        report(
          strict,
          `${tag} Variant "${key}=${String(value)}" is not a defined value for the "${key}" dimension.`,
        )
      }
    })
  }
}

/** Clears dedupe caches. Exposed for test isolation only. */
export function _resetWarned(): void {
  warned.clear()
  pendingAsyncWarns.clear()
  asyncWarnScheduled = false
}
