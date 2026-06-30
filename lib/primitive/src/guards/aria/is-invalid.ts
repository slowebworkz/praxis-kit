import type { InvalidResult, ValidResult } from '../../types'

type AriaResult = ValidResult | InvalidResult

export function isInvalid(result: AriaResult): result is InvalidResult {
  return result.valid === false
}
