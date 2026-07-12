import { extname } from 'node:path'
import { parseSource } from './ast'
import { collectConstraints } from './collect'
import { DEFAULT_CALLEE_NAMES, JSX_EXTS } from './constants'
import { diagnoseUsages } from './diagnose'
import type { Diagnostic, PluginOptions } from './types'

/**
 * Pure analysis entry point. Parses `code` as TypeScript/TSX, extracts
 * enforcement.children constraints from factory calls, and validates JSX usage
 * sites in the same file.
 *
 * Statically-analyzable scope:
 * - Single file: component must be defined and used in the same source file.
 * - Literal-only children: JSX sites that include any JSX expression ({...})
 *   are skipped — their child count is unknowable at build time.
 * - Named const declarations: `export const X = factory(...)` and destructured
 *   patterns are not collected; cross-file analysis is future work.
 *
 * @example
 * ```ts
 * const diagnostics = analyze(source, 'Button.tsx', { severity: 'error' })
 * ```
 */
export function analyze(code: string, filename: string, options?: PluginOptions): Diagnostic[] {
  const ext = extname(filename).slice(1)
  if (!JSX_EXTS.has(ext)) return []

  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES)
  const severity = options?.severity ?? 'warning'

  const source = parseSource(filename, code)

  const constraints = collectConstraints(source, calleeNames)

  return diagnoseUsages(source, constraints, severity)
}
