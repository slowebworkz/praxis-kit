import { LAYOUT_FAMILY_MAP } from './constants'
import type { LayoutFamily, LayoutMode } from './types/layout'

/**
 * The resolved display mode for a single render.
 *
 * Mode is owned by the display props; a display class literal in the resolved
 * class string is a reserved-literal authoring mistake. Defaults to `'none'`
 * when no prop is set.
 *
 * `family` is derived from mode: `'flex'` for flex/inline-flex, `'grid'` for
 * grid/inline-grid, `'none'` for all other values (and when no prop is set).
 * The evaluator uses family — not mode — for utility and gap filtering.
 */
export class LayoutState {
  readonly #mode: LayoutMode
  readonly #family: LayoutFamily

  constructor(mode: LayoutMode) {
    this.#mode = mode
    this.#family = mode === 'none' ? 'none' : LAYOUT_FAMILY_MAP[mode]
    Object.freeze(this)
  }

  get mode(): LayoutMode {
    return this.#mode
  }

  get family(): LayoutFamily {
    return this.#family
  }
}
