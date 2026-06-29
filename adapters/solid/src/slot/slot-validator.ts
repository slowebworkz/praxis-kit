import { StrictBase } from '@praxis-kit/core'
import type { StrictMode } from '@praxis-kit/core'
import { diagnosticsFromStrictMode, SlotDiagnostics } from '@praxis-kit/core/contract'

export class SlotValidator extends StrictBase {
  readonly #name: string

  constructor(name: string, strict: StrictMode) {
    super(diagnosticsFromStrictMode(strict))
    this.#name = name
  }

  assertExclusive(): void {
    this.violate(SlotDiagnostics.exclusive(this.#name))
  }

  // Returns false (instead of throwing) when strict mode caps at warn, so callers can
  // fall through to a safe no-op render rather than calling an undefined render function.
  assertRenderFn(children: unknown): children is (props: Record<string, unknown>) => unknown {
    if (typeof children !== 'function') {
      this.violate(SlotDiagnostics.renderFnRequired(this.#name, typeof children))
      return false
    }
    return true
  }
}
