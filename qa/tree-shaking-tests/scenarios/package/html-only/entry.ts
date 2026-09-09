/**
 * Surgical package-consumption scenario: `praxis-kit/html` (the built-in HTML/ARIA rule library)
 * pulls in `core` but no framework adapter. See contract-only/entry.ts for why this is a
 * framework-neutral entry rather than an adapter-scoped one.
 */
import { HTML_ARIA_RULES } from 'praxis-kit/html'

export { HTML_ARIA_RULES }
