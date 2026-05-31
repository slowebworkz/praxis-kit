import type { LayoutMode } from './types/layout'

/**
 * The resolved layout mode for a single render.
 *
 * The mode is owned by the `flex`/`grid` props (resolved in `createTailwindPipeline`),
 * never inferred from class tokens — a `flex`/`grid` class appearing in the resolved
 * class string is a reserved-literal authoring mistake, not a mode source. Defaults to
 * `'none'` when neither prop is set.
 */
export class LayoutState {
  readonly #mode: LayoutMode

  constructor(mode: LayoutMode) {
    this.#mode = mode
    Object.freeze(this)
  }

  get mode(): LayoutMode {
    return this.#mode
  }
}
