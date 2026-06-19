import type { Plugin } from 'vite'
import { parseSource } from './ast'
import { injectPrecomputedClasses } from './class-extract'
import { collectFileDeclarations } from './collect'
import { pruneDeadCompounds } from './compound-prune'
import { ALL_EXTS, DEFAULT_CALLEE_NAMES, JSX_EXTS } from './constants'
import { analyzeJsxSites } from './diagnose'
import { ConstraintRegistry } from './registry'
import { transformAsChild } from './slot-transform'
import { composeStatically, extractStaticComponents } from './static-compose'
import type { StaticComponent } from './static-compose'
import { extractImportSpecifiers } from './imports'
import type { PluginOptions } from './types'

export type { PluginOptions, Diagnostic, ComponentConstraint, StaticBound } from './types'
export type { ComponentTokens, DesignTokenManifest, DesignTokensOptions } from './design-tokens'
export type { StaticComponent } from './static-compose'
export { analyze } from './analyze'
export { transformAsChild } from './slot-transform'
export { pruneDeadCompounds } from './compound-prune'
export { buildPrecomputedClasses, injectPrecomputedClasses } from './class-extract'
export { collectFileTokens, buildManifest, designTokensPlugin } from './design-tokens'
export { composeStatically, extractStaticComponents } from './static-compose'

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
 * import { contractPlugin } from '@praxis-kit/vite-plugin'
 * export default { plugins: [contractPlugin()] }
 */
export function contractPlugin(options?: PluginOptions): Plugin {
  const registry = new ConstraintRegistry()
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES)
  const severity = options?.severity ?? 'warning'

  return {
    name: 'praxis-kit:contract',

    async transform(code, id) {
      const ext = id.split('.').pop() ?? ''
      if (!JSX_EXTS.has(ext)) return null

      const source = parseSource(id, code)
      // One walk for factory declarations + import specifiers (replaces two separate walks).
      const { constraints, importSpecifiers } = collectFileDeclarations(source, calleeNames)

      registry.registerConstraints(id, constraints)

      // One walk for cardinality violations + ARIA overrides + cross-file usages (replaces three).
      const { diagnostics, usages: allUsages } = analyzeJsxSites(source, constraints, severity)

      for (const d of diagnostics) {
        const loc = { file: id, line: d.line, column: d.col }
        if (d.severity === 'error') {
          this.error({ message: d.message, loc })
        } else {
          this.warn({ message: d.message, loc })
        }
      }

      const localNames = new Set(constraints.map((c) => c.name))

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

/**
 * Vite plugin that removes dead `styling.compounds` entries from factory calls
 * at build time, reducing bundle size and eliminating unreachable CVA compound
 * checks at runtime.
 *
 * A compound entry is dead when any of its conditions reference a variant key
 * that does not exist in `styling.variants`, or a value that is not valid for
 * that key. Only entries whose conditions are fully static (string/array
 * literals) are pruned — dynamic conditions are left unchanged.
 *
 * Place before `contractPlugin` so the pruned source is what gets analyzed.
 *
 * @example
 * // vite.config.ts
 * import { compoundPrunePlugin, contractPlugin } from '@praxis-kit/vite-plugin'
 * export default { plugins: [compoundPrunePlugin(), contractPlugin()] }
 */
export function compoundPrunePlugin(options?: Pick<PluginOptions, 'calleeNames'>): Plugin {
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES)
  return {
    name: 'praxis-kit:compound-prune',
    transform(code, id) {
      const ext = id.split('.').pop() ?? ''
      if (!ALL_EXTS.has(ext)) return null
      const result = pruneDeadCompounds(parseSource(id, code), calleeNames)
      return result !== null ? { code: result } : null
    },
  }
}

/**
 * Vite plugin that pre-computes variant class strings at build time and injects
 * them as a static `precomputedClasses` map into each factory call's `styling`
 * object.
 *
 * At runtime, `VariantClassResolver` checks this map before calling CVA — a
 * plain object lookup replaces a CVA invocation + LRU cache write for every
 * statically-known combination. Only combinations that appear in the map are
 * accelerated; invalid or dynamic variant values fall through to the existing
 * compute path unchanged.
 *
 * Injection is skipped when:
 * - `styling.variants` is absent or contains non-literal values
 * - `styling.compounds` contains non-literal conditions or classes
 * - The number of valid combinations exceeds 512
 *
 * Place after `compoundPrunePlugin` so the injected map reflects the live
 * compound set.
 *
 * @example
 * // vite.config.ts
 * import { compoundPrunePlugin, classExtractPlugin, contractPlugin } from '@praxis-kit/vite-plugin'
 * export default { plugins: [compoundPrunePlugin(), classExtractPlugin(), contractPlugin()] }
 */
export function classExtractPlugin(options?: Pick<PluginOptions, 'calleeNames'>): Plugin {
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES)
  return {
    name: 'praxis-kit:class-extract',
    transform(code, id) {
      const ext = id.split('.').pop() ?? ''
      if (!ALL_EXTS.has(ext)) return null
      const result = injectPrecomputedClasses(parseSource(id, code), calleeNames)
      return result !== null ? { code: result } : null
    },
  }
}

/**
 * Vite plugin that transforms `asChild` JSX usage sites to the render-prop form
 * at build time, eliminating the Slot/cloneElement/mergeProps runtime path.
 *
 * Only transforms sites where the transform is semantically safe:
 * - Exactly one static child element
 * - Child has no `className`, `style`, or event handler props
 *
 * Complex asChild patterns (conflicting props, dynamic children, Slottable
 * siblings) are left unchanged and handled by the runtime Slot path.
 *
 * Place before `contractPlugin` so cardinality analysis sees the transformed
 * source.
 *
 * @example
 * // vite.config.ts
 * import { slotTransformPlugin, contractPlugin } from '@praxis-kit/vite-plugin'
 * export default { plugins: [slotTransformPlugin(), contractPlugin()] }
 */
export function slotTransformPlugin(): Plugin {
  return {
    name: 'praxis-kit:slot-transform',
    transform(code, id) {
      const ext = id.split('.').pop() ?? ''
      if (!JSX_EXTS.has(ext)) return null
      const result = transformAsChild(parseSource(id, code))
      return result !== null ? { code: result } : null
    },
  }
}

/**
 * Vite plugin that replaces polymorphic component usage sites with direct
 * element creation at build time, eliminating the runtime render pipeline for
 * statically-analyzable usages.
 *
 * **Requires classExtractPlugin to run first** so that `precomputedClasses` is
 * present in the factory call before this plugin reads it. Place after
 * `classExtractPlugin` in the plugins array.
 *
 * A usage site is inlined when:
 * - The component is defined in the same file or imported from a file already
 *   transformed by this plugin, with `precomputedClasses` injected
 * - No `as`, `asChild`, `render`, or spread attributes at the site
 * - All variant props are static string literals
 * - `className` is absent or a static string literal
 * - The factory config has no `defaults` or `enforcement`
 *
 * Cross-file inlining degrades gracefully when the definition file has not yet
 * been transformed (dev mode ordering, barrel re-exports, aliased imports).
 *
 * @example
 * // vite.config.ts
 * import { classExtractPlugin, staticCompositionPlugin } from '@praxis-kit/vite-plugin'
 * export default { plugins: [classExtractPlugin(), staticCompositionPlugin()] }
 */
export function staticCompositionPlugin(options?: Pick<PluginOptions, 'calleeNames'>): Plugin {
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES)
  // fileId → Map<componentName, StaticComponent> — populated as files are transformed.
  const registry = new Map<string, Map<string, StaticComponent>>()

  return {
    name: 'praxis-kit:static-compose',

    buildStart() {
      registry.clear()
    },

    async transform(code, id) {
      const ext = id.split('.').pop() ?? ''
      if (!JSX_EXTS.has(ext)) return null

      const source = parseSource(id, code)

      // Register this file's factory definitions so consumers can look them up.
      const sameFile = extractStaticComponents(source, calleeNames)
      if (sameFile.size > 0) registry.set(id, sameFile)

      // Resolve named imports to their source file IDs and look up the registry.
      const importedComponents = new Map<string, StaticComponent>()
      const importSpecifiers = extractImportSpecifiers(source)
      for (const [localName, specifier] of importSpecifiers) {
        const resolved = await this.resolve(specifier, id)
        if (!resolved) continue
        const entry = registry.get(resolved.id)
        if (!entry) continue
        const component = entry.get(localName)
        if (component) importedComponents.set(localName, component)
      }

      const result = composeStatically(source, calleeNames, importedComponents)
      return result !== null ? { code: result } : null
    },
  }
}

/**
 * Convenience plugin bundle that applies all three build-time rendering
 * optimisations in the correct dependency order:
 *
 *   1. `slotTransformPlugin`       — rewrites `asChild` → render-prop form,
 *                                    eliminating `cloneElement` for static sites
 *   2. `classExtractPlugin`        — injects `precomputedClasses` into factory
 *                                    calls for O(1) variant class resolution
 *   3. `staticCompositionPlugin`   — inlines same-file static usages into direct
 *                                    element creation, bypassing the runtime
 *                                    pipeline entirely
 *
 * Place before `contractPlugin` so cardinality analysis sees the transformed
 * source. Especially effective for SSR builds where each component renders
 * exactly once per request and eliminates per-render pipeline overhead.
 *
 * @example
 * // vite.config.ts
 * import { ssrOptimizePlugin, contractPlugin } from '@praxis-kit/vite-plugin'
 * export default { plugins: [ssrOptimizePlugin(), contractPlugin()] }
 */
export function ssrOptimizePlugin(options?: Pick<PluginOptions, 'calleeNames'>): Plugin[] {
  return [slotTransformPlugin(), classExtractPlugin(options), staticCompositionPlugin(options)]
}
