import { landmarkAccessibleNameRule, landmarkRoleRule } from '../../aria-rules'
import { ariaContract } from '../helpers'

// ─── Landmark role contract ───────────────────────────────────────────────────

/**
 * Elements with an unconditional landmark role (`<article>`, `<aside>`, `<footer>`,
 * `<header>`, `<main>`, `<nav>`).
 *
 * - `role="<implicit>"` → warning: redundant, removed (built-in engine behaviour).
 * - `role="<anything else>"` → error: overrides the fixed landmark, removed.
 * - `<nav>` and `<aside>` without an accessible name → warning (commonly multiplied).
 */
export const landmarkContract = ariaContract([landmarkRoleRule, landmarkAccessibleNameRule])
