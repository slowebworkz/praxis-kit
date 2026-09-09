import type { AriaContext } from './aria-context'
import type { AriaResult } from './aria-result'

// `readsProps` is opt-in: a rule that declares it only inspects the listed prop keys lets the
// engine fold those keys into its plan cache key instead of bypassing the cache outright. Rules
// that omit it are assumed to read arbitrary props and disable caching whenever present.
//
// `tags` is also opt-in: a rule that declares it only ever produces a result for the listed tags
// lets the engine skip calling it at all for any other tag, instead of the rule being called for
// every element and internally early-returning `if (tag !== 'input') return []`. Rules that omit
// it are assumed relevant to every tag and are always called.
export type AriaRule<C extends AriaContext = AriaContext> = ((
  context: C,
) => readonly AriaResult[]) & {
  readonly readsProps?: readonly string[]
  readonly tags?: readonly string[]
}
