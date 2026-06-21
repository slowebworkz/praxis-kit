import type { MergeStrategy } from '@pk2/merge'
import type { StyleContext } from './types'

export const styleMergeStrategy: MergeStrategy<StyleContext> = {
  merge(previous, incoming) {
    return {
      classes: [...previous.classes, ...(incoming.classes ?? [])],
    }
  },
}
