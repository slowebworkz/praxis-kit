export interface SourcePosition {
  line: number
  col: number
}

export interface SourceLocation {
  file: string
  start: SourcePosition
  end?: SourcePosition
}
