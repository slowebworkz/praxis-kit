import { StrictBase } from '@praxis-ui/core'
import type { StrictMode } from '@praxis-ui/core'

export class SlotValidator extends StrictBase {
  readonly #name: string
  readonly #elementTerm: string

  constructor(name: string, strict: StrictMode, elementTerm: string) {
    super(strict)
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
    this.violate(
      `${this.#name}: asChild requires exactly one ${this.#elementTerm} child, got ${count}`,
    )
  }
}
