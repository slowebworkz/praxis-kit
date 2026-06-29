import { StrictBase } from '@praxis-kit/core'
import type { StrictMode } from '@praxis-kit/core'
import { diagnosticsFromStrictMode } from '@praxis-kit/core/contract'

export class SlotValidator extends StrictBase {
  readonly #name: string
  readonly #elementTerm: string

  constructor(name: string, strict: StrictMode, elementTerm: string) {
    super(diagnosticsFromStrictMode(strict))
    this.#name = name
    this.#elementTerm = elementTerm
  }

  assertExclusive(): void {
    this.violate(`${this.#name}: "as" and "asChild" are mutually exclusive`)
  }

  warnDiscardedChildren(count: number): void {
    const suffix = count === 1 ? '' : 'ren'
    this.warn(
      `${this.#name}: asChild discarded ${count} non-element child${suffix} — ` +
        `only ${this.#elementTerm}s are valid asChild children.`,
    )
  }

  assertSingleChild(count: number): void {
    const msg =
      count === 0
        ? `${this.#name}: asChild requires a ${this.#elementTerm} child`
        : `${this.#name}: asChild requires exactly one ${this.#elementTerm} child, got ${count}`
    this.violate(msg)
  }
}
