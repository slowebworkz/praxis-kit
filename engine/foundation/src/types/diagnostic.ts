export interface Diagnostic {
  code: string
  message: string
  severity: 'error' | 'warning' | 'info'
}
