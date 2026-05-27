import { StrictBase } from '@polymorphic-ui/core'
import type { StrictMode } from '@polymorphic-ui/core'

export class SlotValidator extends StrictBase {
  readonly #name: string

  constructor(name: string, strict: StrictMode) {
    super(strict)
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
