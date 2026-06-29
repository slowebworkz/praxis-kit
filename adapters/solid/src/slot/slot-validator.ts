import { StrictBase } from '@praxis-kit/core'
import type { StrictMode } from '@praxis-kit/core'
import { diagnosticsFromStrictMode } from '@praxis-kit/core/contract'

export class SlotValidator extends StrictBase {
  readonly #name: string

  constructor(name: string, strict: StrictMode) {
    super(diagnosticsFromStrictMode(strict))
    this.#name = name
  }

  assertExclusive(): void {
    this.violate(`${this.#name}: "as" and "asChild" are mutually exclusive`)
  }

  // Returns false (instead of throwing) when strict mode caps at warn, so callers can
  // fall through to a safe no-op render rather than calling an undefined render function.
  assertRenderFn(children: unknown): children is (props: Record<string, unknown>) => unknown {
    if (typeof children !== 'function') {
      this.violate(
        `${this.#name}: asChild requires a render function as children, got ${typeof children}`,
      )
      return false
    }
    return true
  }
}
