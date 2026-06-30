import type { MergeStrategy } from '@pk2/pipeline'
import type { StyleContext } from './types'

export const styleMergeStrategy: MergeStrategy<StyleContext> = {
  merge(previous, incoming) {
    return {
      classes: [...previous.classes, ...(incoming.classes ?? [])],
    }
  },
}
