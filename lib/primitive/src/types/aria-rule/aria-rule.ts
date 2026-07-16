import type { AriaContext } from './aria-context'
import type { AriaResult } from './aria-result'

// `readsProps` is opt-in: a rule that declares it only inspects the listed prop keys lets the
// engine fold those keys into its plan cache key instead of bypassing the cache outright. Rules
// that omit it are assumed to read arbitrary props and disable caching whenever present.
export type AriaRule<C extends AriaContext = AriaContext> = ((
  context: C,
) => readonly AriaResult[]) & {
  readonly readsProps?: readonly string[]
}
