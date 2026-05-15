import { assertNever } from '@polymorphic-ui/core'
import type { ClassifiedToken } from './types/classified-token'
import type { DependencyRules } from './dependency-rules'
import type { LayoutState } from './layout-state'

export class DependencyEvaluator {
  constructor(private readonly rules: DependencyRules) {}

  evaluate(token: ClassifiedToken, state: LayoutState): boolean {
    switch (token.kind) {
      case 'layout': {
        return token.value === state.mode
      }

      case 'conditional': {
        return token.requires === state.mode
      }

      case 'utility': {
        for (const layout of Object.keys(this.rules) as (keyof DependencyRules)[]) {
          if (this.rules[layout].some((r) => r.test(token.base))) {
            return state.mode === layout
          }
        }

        return true
      }

      case 'gap': {
        return state.mode !== 'none'
      }

      default:
        return assertNever(token)
    }
  }
}
