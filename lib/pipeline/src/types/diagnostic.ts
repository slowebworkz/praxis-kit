/** A single problem reported by a pass. The pipeline engine only carries these
 *  through — interpreting, formatting, and failing on them is the caller's job. */
export interface Diagnostic {
  code: string
  message: string
  severity: 'error' | 'warning' | 'info'
}
