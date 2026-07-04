import { InvariantBase } from '@praxis-kit/core'
import { SlotDiagnostics } from '@praxis-kit/core/contract'
import type { Diagnostics } from '@praxis-kit/diagnostics'

export class SlotValidator extends InvariantBase {
  readonly #name: string

  constructor(name: string, diagnostics: Diagnostics) {
    super(diagnostics)
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
