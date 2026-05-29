import type { ComponentConstraint, FileDiagnostic, PendingUsage, Severity } from './types'

/**
 * Accumulates constraint and import data across multiple `transform` calls so
 * that cross-file cardinality violations can be detected in `buildEnd`.
 *
 * Lifecycle:
 * 1. `registerConstraints(id, ...)` — called for every TSX/JSX file that
 *    defines constrained components.
 * 2. `registerImports(id, resolvedMap)` — called when a file imports component
 *    names that appear in JSX; the map keys are local binding names, values are
 *    the absolute file IDs returned by `this.resolve()`.
 * 3. `addPendingUsage(id, usage)` — records a JSX usage whose tag name is
 *    imported from another file, for deferred validation.
 * 4. `diagnostics(severity)` — called once in `buildEnd`; resolves each pending
 *    usage to its source constraint and emits a `FileDiagnostic` for any
 *    cardinality violation.
 */
export class ConstraintRegistry {
  private readonly constraints = new Map<string, Map<string, ComponentConstraint>>()
  private readonly importMap = new Map<string, Map<string, string>>()
  private readonly pending = new Map<string, PendingUsage[]>()

  registerConstraints(fileId: string, cs: ComponentConstraint[]): void {
    this.constraints.set(fileId, new Map(cs.map((c) => [c.name, c])))
  }

  /** resolvedImports: local name → absolute file ID of the exporting module. */
  registerImports(fileId: string, resolvedImports: Map<string, string>): void {
    this.importMap.set(fileId, resolvedImports)
  }

  addPendingUsage(fileId: string, usage: PendingUsage): void {
    let list = this.pending.get(fileId)
    if (!list) {
      list = []
      this.pending.set(fileId, list)
    }
    list.push(usage)
  }

  /** Resolves a component name used in `fileId` to its constraint definition. */
  resolveConstraint(fileId: string, name: string): ComponentConstraint | undefined {
    const imports = this.importMap.get(fileId)
    if (!imports) return undefined
    const sourceId = imports.get(name)
    if (!sourceId) return undefined
    return this.constraints.get(sourceId)?.get(name)
  }

  /** Returns cardinality violations across all pending cross-file usages. */
  diagnostics(severity: Severity): FileDiagnostic[] {
    const result: FileDiagnostic[] = []

    for (const [fileId, usages] of this.pending) {
      for (const usage of usages) {
        if (usage.count === undefined) continue

        const constraint = this.resolveConstraint(fileId, usage.tagName)
        if (!constraint) continue

        const { totalMin, totalMax, name } = constraint
        if (usage.count >= totalMin && usage.count <= totalMax) continue

        const rangeText =
          totalMax === Infinity
            ? `at least ${totalMin}`
            : totalMin === totalMax
              ? `exactly ${totalMin}`
              : `${totalMin}–${totalMax}`
        const childWord = totalMax === 1 && totalMin === 1 ? 'child' : 'children'

        result.push({
          fileId,
          message: `<${name}> expects ${rangeText} ${childWord} but received ${usage.count}.`,
          line: usage.line,
          col: usage.col,
          severity,
        })
      }
    }

    return result
  }
}
