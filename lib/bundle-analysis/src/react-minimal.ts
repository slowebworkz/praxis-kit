/**
 * Claim: a component with no enforcement and no styling retains only the
 * render primitive. No AriaPolicyEngine, no ChildrenEvaluator, no class
 * pipeline should appear in this bundle slice.
 */
import { createContractComponent } from '@polymorphic-ui/react'

export const Box = createContractComponent({ tag: 'div', name: 'Box' })
