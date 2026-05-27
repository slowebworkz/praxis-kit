import type { Plugin } from 'vite'
import { parseSource } from './ast'
import { collectConstraints } from './collect'
import { collectJsxUsages, diagnoseUsages } from './diagnose'
import { extractImportSpecifiers } from './imports'
import { ConstraintRegistry } from './registry'
import type { PluginOptions } from './types'

export type { PluginOptions, Diagnostic, ComponentConstraint, StaticBound } from './types'
export { analyze } from './analyze'

const DEFAULT_CALLEE_NAMES = ['createPolymorphicComponent', 'createContractComponent']

/**
 * Vite plugin that performs static enforcement.children cardinality checks at
 * build time for components created with createContractComponent.
 *
 * **Single-file scope:** Components defined and used in the same `.tsx` / `.jsx`
 * file are validated during `transform`. JSX children containing expressions
 * (`{...}`) are skipped — their count is unknowable at compile time.
 *
 * **Cross-file scope:** Components imported from other files are validated in
 * `buildEnd` once the full constraint registry is populated. Only named imports
 * whose source file was also transformed by this plugin are checked.
 *
 * @example
 * // vite.config.ts
 * import { contractPlugin } from '@praxis-ui/vite-plugin'
 * export default { plugins: [contractPlugin()] }
 */
export function contractPlugin(options?: PluginOptions): Plugin {
  const registry = new ConstraintRegistry()
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES)
  const severity = options?.severity ?? 'warning'

  return {
    name: 'praxis-ui:contract',

    async transform(code, id) {
      const ext = id.split('.').pop() ?? ''
      if (!['tsx', 'jsx'].includes(ext)) return null

      const source = parseSource(id, code)
      const constraints = collectConstraints(source, calleeNames)

      registry.registerConstraints(id, constraints)

      // Emit same-file violations immediately.
      for (const d of diagnoseUsages(source, constraints, severity)) {
        const loc = { file: id, line: d.line, column: d.col }
        if (d.severity === 'error') {
          this.error({ message: d.message, loc })
        } else {
          this.warn({ message: d.message, loc })
        }
      }

      // Collect cross-file pending usages for imported component names.
      const importSpecifiers = extractImportSpecifiers(source)
      const localNames = new Set(constraints.map((c) => c.name))
      const allUsages = collectJsxUsages(source)

      // Only resolve imports for names actually used in JSX.
      const importedTagsInUse = new Set(
        allUsages
          .filter((u) => !localNames.has(u.tagName) && importSpecifiers.has(u.tagName))
          .map((u) => u.tagName),
      )

      if (importedTagsInUse.size > 0) {
        const resolvedImports = new Map<string, string>()
        for (const [name, specifier] of importSpecifiers) {
          if (!importedTagsInUse.has(name)) continue
          const resolved = await this.resolve(specifier, id)
          if (resolved) resolvedImports.set(name, resolved.id)
        }
        registry.registerImports(id, resolvedImports)

        for (const usage of allUsages) {
          if (importedTagsInUse.has(usage.tagName)) {
            registry.addPendingUsage(id, usage)
          }
        }
      }
    },

    buildEnd() {
      for (const d of registry.diagnostics(severity)) {
        const loc = { file: d.fileId, line: d.line, column: d.col }
        if (d.severity === 'error') {
          this.error({ message: d.message, loc })
        } else {
          this.warn({ message: d.message, loc })
        }
      }
    },
  }
}
