/**
 * Claim: importing createPolymorphic from @praxis-ui/core/primitive pulls in only
 * the render primitive — no ARIA engine, no class pipeline, no children evaluator,
 * and no framework adapter. This is the baseline for adapter authors.
 */
import { createPolymorphic } from '@praxis-ui/core/primitive'

export const boxRuntime = createPolymorphic({ tag: 'div', name: 'Box' })
