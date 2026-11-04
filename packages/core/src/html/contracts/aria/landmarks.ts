import { landmarkRoleRule } from '../../aria-rules'
import { ariaContract } from '../helpers'

// ─── Landmark role contract ───────────────────────────────────────────────────

/**
 * Elements with an unconditional landmark role (`<article>`, `<aside>`, `<footer>`,
 * `<header>`, `<main>`, `<nav>`).
 *
 * - `role="<implicit>"` → warning: redundant, removed (built-in engine behaviour).
 * - `role="<anything else>"` → error: overrides the fixed landmark, removed.
 * Accessible names are intentionally not required by this element-local contract:
 * whether repeated landmarks need distinguishing names depends on page-level context.
 */
export const landmarkContract = ariaContract([landmarkRoleRule])
