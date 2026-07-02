import type { AriaContext } from './aria-context'
import type { AriaResult } from './aria-result'

export type AriaRule<C extends AriaContext = AriaContext> = (context: C) => readonly AriaResult[]
