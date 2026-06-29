import { InvariantBase } from '@praxis-kit/core'
import type { StrictMode } from '@praxis-kit/core'
import { diagnosticsFromStrictMode, SlotDiagnostics } from '@praxis-kit/core/contract'

export class SlotValidator extends InvariantBase {
  readonly #name: string
  readonly #elementTerm: string

  constructor(name: string, strict: StrictMode, elementTerm: string) {
    super(diagnosticsFromStrictMode(strict))
    this.#name = name
    this.#elementTerm = elementTerm
  }

  assertExclusive(): void {
    this.violate(SlotDiagnostics.exclusive(this.#name))
  }

  warnDiscardedChildren(count: number): void {
    this.warn(SlotDiagnostics.discardedChildren(this.#name, this.#elementTerm, count))
  }

  assertSingleChild(count: number): void {
    this.violate(
      count === 0
        ? SlotDiagnostics.singleChildRequired(this.#name, this.#elementTerm)
        : SlotDiagnostics.singleChildExceeded(this.#name, this.#elementTerm, count),
    )
  }
}
