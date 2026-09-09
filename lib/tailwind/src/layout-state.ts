import { LAYOUT_FAMILY_MAP } from './constants'
import type { layoutKeys } from './layout-keys'
import type { LayoutFamily, ResolvedLayout } from './types/layout'

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
  readonly #mode: ResolvedLayout<typeof layoutKeys>
  readonly #family: LayoutFamily<typeof LAYOUT_FAMILY_MAP>

  constructor(mode: ResolvedLayout<typeof layoutKeys>) {
    this.#mode = mode
    this.#family = mode === 'none' ? 'none' : LAYOUT_FAMILY_MAP[mode]
    Object.freeze(this)
  }

  get mode(): ResolvedLayout<typeof layoutKeys> {
    return this.#mode
  }

  get family(): LayoutFamily<typeof LAYOUT_FAMILY_MAP> {
    return this.#family
  }
}
