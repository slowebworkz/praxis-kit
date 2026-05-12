import type { ClassifiedToken } from './types/classified-token'
import type { LayoutKey, LayoutMode } from './types/layout'

export class LayoutState {
  readonly #mode: LayoutMode

  constructor(tokens: ClassifiedToken[], layoutOverride?: LayoutKey) {
    const hasFlex = tokens.some((t) => t.kind === 'layout' && t.value === 'flex')
    const hasGrid = tokens.some((t) => t.kind === 'layout' && t.value === 'grid')

    if (layoutOverride) {
      this.#mode = layoutOverride
    } else if (hasFlex) {
      this.#mode = 'flex'
    } else if (hasGrid) {
      this.#mode = 'grid'
    } else {
      this.#mode = 'none'
    }

    Object.freeze(this)
  }

  get mode(): LayoutMode {
    return this.#mode
  }
}
