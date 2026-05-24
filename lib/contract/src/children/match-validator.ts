import type { ChildIndex, MatchMatrix, StrictMode } from '../types'
import { StrictBase } from '../strict'
import { MatchValidationErrorBuilder } from './match-validation-error-builder'
import { getTypeName } from './get-type-name'

export class MatchValidator extends StrictBase {
  readonly #builder: MatchValidationErrorBuilder

  constructor(context: string, strict: StrictMode) {
    super(strict)
    this.#builder = new MatchValidationErrorBuilder(context)
  }

  validate(children: unknown[], matrix: MatchMatrix, ruleNames: readonly string[]): void {
    // Batch all violations before reporting so the caller sees the full picture in one throw.
    const errors: string[] = []

    for (const [i, child] of children.entries()) {
      const matches = matrix.childToRules.forward.get(i as ChildIndex)

      if (!matches) {
        errors.push(this.#builder.unexpectedChild(getTypeName(child), i))
        continue
      }

      if (matches.size === 1) continue

      const typeName = getTypeName(child)
      const names: string[] = []
      for (const ri of matches) {
        names.push(ruleNames[ri] ?? `#${ri}`)
      }
      errors.push(this.#builder.multipleMatches(typeName, i, names))
    }

    this.invariant(errors.length === 0, this.#builder.toError(errors).message)
  }
}
