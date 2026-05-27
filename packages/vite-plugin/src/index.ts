import type { Plugin } from 'vite'
import { analyze } from './analyze'
import type { PluginOptions } from './types'

export type { PluginOptions, Diagnostic, ComponentConstraint, StaticBound } from './types'
export { analyze } from './analyze'

/**
 * Vite plugin that performs static enforcement.children cardinality checks at
 * build time for components created with createPolymorphicComponent /
 * createContractComponent.
 *
 * **Scope (prototype):** Single-file analysis only. Components defined and
 * used in the same `.tsx` / `.jsx` file are validated; cross-file usage is not
 * yet supported. JSX children containing expressions (`{...}`) are skipped
 * because their count is unknowable at compile time.
 *
 * @example
 * // vite.config.ts
 * import { contractPlugin } from '@praxis-ui/vite-plugin'
 * export default { plugins: [contractPlugin()] }
 */
export function contractPlugin(options?: PluginOptions): Plugin {
  return {
    name: 'praxis-ui:contract',
    transform(code, id) {
      const diagnostics = analyze(code, id, options)
      for (const d of diagnostics) {
        const position = { line: d.line, column: d.col }
        if (d.severity === 'error') {
          this.error({ message: d.message, pos: undefined, loc: { file: id, ...position } })
        } else {
          this.warn({ message: d.message, pos: undefined, loc: { file: id, ...position } })
        }
      }
    },
  }
}
