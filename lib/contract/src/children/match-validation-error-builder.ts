export class MatchValidationErrorBuilder {
  readonly #prefix: string

  constructor(ctx = '') {
    this.#prefix = ctx ? `${ctx}:\n` : ''
  }

  #template(typeName: string, index: number, prefix: string = '', suffix: string = '') {
    const leadingStr = prefix ? `${prefix} ` : ''
    const followingStr = suffix ? ` ${suffix}` : ''

    return `${leadingStr}child "${typeName}" at index ${index}${followingStr}.`
  }

  unexpectedChild(typeName: string, index: number): string {
    return this.#template(typeName, index, 'unexpected')
  }

  multipleMatches(typeName: string, index: number, ruleNames: string[]): string {
    const quoted = ruleNames.map((n) => `"${n}"`)
    return this.#template(
      typeName,
      index,
      '',
      `matches multiple child rules: ${quoted.join(' and ')}`,
    )
  }

  #format(errors: string[]): string {
    return this.#prefix + errors.join('\n')
  }

  toError(errors: string[]): Error {
    if (errors.length === 0) {
      return new Error(this.#prefix + 'Unknown validation error.')
    }
    return new Error(this.#format(errors))
  }
}
