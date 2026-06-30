/**
 * Claim: importing createPolymorphic from @praxis-kit/core/primitive pulls in only
 * the render primitive — no ARIA engine, no class pipeline, no children evaluator,
 * and no framework adapter. This is the baseline for adapter authors.
 */
import { createPolymorphic } from '@praxis-kit/core/primitive'

export const boxRuntime = createPolymorphic({ tag: 'div', name: 'Box' })
