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

  assertSingleChild(count: number): void {
    this.violate(`${this.#name}: asChild requires exactly one VNode child, got ${count}`)
  }
}
