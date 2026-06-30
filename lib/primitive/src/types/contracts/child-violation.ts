export type ChildViolationKind =
  | 'cardinality-min'
  | 'cardinality-max'
  | 'position'
  | 'unexpected'
  | 'ambiguous'

export type ChildViolation = {
  kind: ChildViolationKind
  message: string
  /** Present for cardinality and position violations. */
  ruleName?: string
  /** Present for unexpected and ambiguous violations. */
  childIndex?: number
}
