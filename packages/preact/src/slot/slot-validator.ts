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

  warnDiscardedChildren(count: number): void {
    const suffix = count === 1 ? '' : 'ren'
    this.warn(
      `${this.#name}: asChild discarded ${count} non-element child${suffix} — ` +
        `only Preact elements are valid asChild children.`,
    )
  }

  assertSingleChild(count: number): void {
    this.violate(`${this.#name}: asChild requires exactly one Preact element child, got ${count}`)
  }
}
