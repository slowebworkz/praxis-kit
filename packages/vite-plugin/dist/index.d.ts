import { Plugin } from 'vite';
import { Cardinality, ChildRulePosition, Severity } from '@praxis-ui/core';
import ts from 'typescript';

/**
 * One enforcement.children rule whose cardinality is statically extractable
 * from the factory call AST. The `Cardinality` discriminated union matches the
 * shape used by the runtime `ChildrenEvaluator` — unbounded rules contribute
 * Infinity to `totalMax`.
 */
type StaticBound = {
    cardinality: Cardinality;
    position: ChildRulePosition;
};
/**
 * A component definition collected from a createPolymorphicComponent /
 * createContractComponent call whose enforcement.children array contains at
 * least one rule with a statically-extractable cardinality.
 */
type ComponentConstraint = {
    /** Variable name the component is bound to (e.g. "Button"). */
    name: string;
    /** One entry per ChildRuleInput whose cardinality is a literal object. */
    rules: StaticBound[];
    /** Sum of all rule.cardinality.min values. */
    totalMin: number;
    /** Sum of all rule.cardinality.max values; Infinity if any rule is unbounded. */
    totalMax: number;
    /** The default HTML tag declared in the factory call (`tag: 'button'`), if statically present. */
    defaultTag?: string;
    /** True when `enforcement.aria` is a non-empty array literal in the factory call. */
    hasAriaRules: boolean;
};

/** A diagnostic produced by the static analysis pass. */
type Diagnostic = {
    message: string;
    /** 1-based line number in the source file. */
    line: number;
    /** 1-based column number. */
    col: number;
    /**
     * Uses the same Severity vocabulary as ValidationViolation in
     * @praxis-ui/contract — 'error' | 'warning'. The plugin wrapper maps
     * 'warning' → this.warn() and 'error' → this.error() for Rollup/Vite.
     */
    severity: Severity;
};

/** Options accepted by contractPlugin() and analyze(). */
type PluginOptions = {
    /**
     * Factory function names to look for.
     * @default ['createPolymorphicComponent', 'createContractComponent']
     */
    calleeNames?: string[];
    /**
     * Severity of cardinality violations in Vite build output.
     * Matches the Severity vocabulary used by ValidationViolation.
     * @default 'warning'
     */
    severity?: Severity;
};

type ComponentTokens = {
    base: string[];
    variantClasses: string[];
    compoundClasses: string[];
    tagClasses: string[];
};
type DesignTokenManifest = {
    components: Record<string, ComponentTokens>;
    allClasses: string[];
};
/**
 * Collects design tokens from all factory calls in a single source file.
 * Each entry in the returned map is keyed by the component variable name.
 *
 * Only `const X = factory(...)` declarations are handled; exported or
 * destructured patterns fall through (same scope as `collectConstraints`).
 */
declare function collectFileTokens(source: ts.SourceFile, calleeNames: ReadonlySet<string>): Map<string, ComponentTokens>;
declare function buildManifest(allTokens: Map<string, ComponentTokens>): DesignTokenManifest;
type DesignTokensOptions = {
    /**
     * Path where the manifest JSON is written, relative to the Vite project root.
     * @default 'praxis-tokens.json'
     */
    outFile?: string;
} & Pick<PluginOptions, 'calleeNames'>;
/**
 * Vite plugin that collects every statically-declared class string from
 * `createContractComponent` factory calls and writes a design token manifest
 * to a JSON file on each build.
 *
 * The manifest contains per-component class lists and a flat `allClasses`
 * union that can be used as a Tailwind content source to prevent purging of
 * variant classes.
 *
 * @example
 * // vite.config.ts
 * import { designTokensPlugin } from '@praxis-ui/vite-plugin'
 * export default { plugins: [designTokensPlugin({ outFile: 'praxis-tokens.json' })] }
 *
 * @example
 * // tailwind.config.js
 * export default { content: ['./src/**', './praxis-tokens.json'] }
 */
declare function designTokensPlugin(options?: DesignTokensOptions): Plugin;

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
 */
declare function analyze(code: string, filename: string, options?: PluginOptions): Diagnostic[];

/**
 * Compile-time asChild → render-prop transform.
 *
 * Rewrites JSX usage sites of the form:
 *   <Component asChild ...props>
 *     <childTag ...childProps>children</childTag>
 *   </Component>
 *
 * to the render-prop form:
 *   <Component render={(_p) => <childTag ...childProps {..._p} />} ...props />
 *
 * The render-prop form eliminates the Slot/cloneElement/mergeProps path at
 * runtime — resolved props are passed directly to the render callback with no
 * element cloning.
 *
 * **Safety conditions** — the transform is skipped if any of these are true:
 *   1. The child has a dynamic `className` expression (cannot merge safely).
 *      A string-literal `className` IS handled: the transform generates
 *      `{..._p, className: _p.className + ' childCls'}`.
 *   2. The child has a bare `style` or `on*` attribute without an initializer.
 *      Static object-literal and expression-valued `style` props are merged:
 *      `style={{..._p.style, ...childStyle}}`.  Event handlers are composed:
 *      `onClick={(_e) => { (childHandler)(_e); _p.onClick?.(_e); }}`.
 *   3. The component name starts with a lowercase letter (HTML intrinsic — not
 *      a polymorphic component).
 *   4. There are zero or more than one meaningful child elements.
 *
 * The transform is conservative: any condition that is not statically clear
 * causes the node to be left unchanged.
 */

/**
 * Applies the asChild → render-prop transform to the given TypeScript source
 * file and returns the printed output.
 *
 * Returns null if no `asChild` attribute is found in the source (fast path —
 * avoids parsing overhead for files that don't use the pattern).
 */
declare function transformAsChild(source: ts.SourceFile): string | null;

/**
 * Compile-time dead compound variant pruning.
 *
 * Removes entries from `styling.compounds` whose conditions can never fire:
 *   - condition key is not in `styling.variants`
 *   - condition value (string) is not a valid value for that variant key
 *   - condition value (array) has no element that is a valid value
 *
 * Only entries whose conditions are all statically evaluable (string/array
 * literals throughout) are candidates for pruning — dynamic conditions (variable
 * references, computed values) are left unchanged.
 *
 * Returns null if no factory calls with `styling.compounds` are found, or if
 * every compound in every factory call passes the validity check.
 */

/**
 * Applies dead-compound pruning to the given TypeScript source file.
 *
 * Returns null when the file has no factory calls with `styling.compounds`, or
 * when every compound entry passes validity — i.e., when no pruning is needed.
 */
declare function pruneDeadCompounds(source: ts.SourceFile, calleeNames: ReadonlySet<string>): string | null;

/**
 * Compile-time variant class precomputation.
 *
 * Extracts `styling.variants`, `styling.defaults`, and `styling.compounds` from
 * factory call ASTs, enumerates all statically-known prop combinations, computes
 * the variant class string for each, and injects the resulting map as
 * `styling.precomputedClasses` directly into the source.
 *
 * At runtime, `VariantClassResolver` checks `precomputedClasses` before
 * calling CVA — a plain object lookup replaces a CVA invocation + LRU cache
 * write for every covered combination.
 *
 * **Skipped when any of the following are true:**
 * - `styling.variants` is absent or contains non-literal values
 * - `styling.compounds` contains non-literal conditions or class values
 * - The total number of combinations exceeds MAX_COMBINATIONS
 * - The styling object already has a `precomputedClasses` property
 */

/**
 * Builds a precomputed class map for the given styling object literal.
 *
 * Returns null when static extraction is not possible (non-literal values,
 * no variants, or combination count exceeds MAX_COMBINATIONS).
 */
declare function buildPrecomputedClasses(stylingObj: ts.ObjectLiteralExpression): Record<string, string> | null;
/**
 * Injects precomputed variant class maps into all factory calls in the given
 * source file that have fully-static `styling.variants` configurations.
 *
 * Returns null when no factory calls with injectable variants are found.
 */
declare function injectPrecomputedClasses(source: ts.SourceFile, calleeNames: ReadonlySet<string>): string | null;

/**
 * Compile-time static composition transform.
 *
 * For same-file factory calls that have `precomputedClasses` injected (by
 * classExtractPlugin), replaces static JSX usage sites with direct element
 * creation — bypassing the runtime render pipeline entirely.
 *
 * Example:
 *   // Source (same file defines Button and uses it)
 *   const Button = createContractComponent({ tag: 'button', styling: { precomputedClasses: {...} } })
 *   <Button size="lg">Click</Button>
 *
 *   // Output
 *   const Button = createContractComponent({ ... }) // unchanged — still exported
 *   <button className="btn btn-lg">Click</button>  // inlined!
 *
 * **Eligibility conditions** — a usage site is inlined only when:
 *   1. The component is defined in the same file via a factory call with
 *      `precomputedClasses` (classExtractPlugin must run first in the chain)
 *   2. No `as`, `asChild`, `render`, or spread attributes at the usage site
 *   3. All variant props are static string literals
 *   4. `className` is absent or a static string literal
 *   5. The factory config has no top-level `defaults` and no `enforcement`
 *      (either would require runtime prop normalization that inlining skips)
 *
 * The factory call itself is intentionally left in the output so the component
 * remains exportable for cross-file consumption that falls back to the runtime
 * path. Dead-code elimination at the bundler level can remove it when no
 * runtime path remains.
 *
 * **Deferred:** cross-file inlining (component defined in one module, used in
 * another) requires Vite module-graph traversal and is not yet implemented.
 */

/**
 * Applies the static composition transform to the given source file.
 *
 * Returns null when:
 * - No eligible factory calls are found in the file
 * - No eligible usage sites are found after analysis
 */
declare function composeStatically(source: ts.SourceFile, calleeNames: ReadonlySet<string>): string | null;

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
declare function contractPlugin(options?: PluginOptions): Plugin;
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
 * import { compoundPrunePlugin, contractPlugin } from '@praxis-ui/vite-plugin'
 * export default { plugins: [compoundPrunePlugin(), contractPlugin()] }
 */
declare function compoundPrunePlugin(options?: Pick<PluginOptions, 'calleeNames'>): Plugin;
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
 * import { compoundPrunePlugin, classExtractPlugin, contractPlugin } from '@praxis-ui/vite-plugin'
 * export default { plugins: [compoundPrunePlugin(), classExtractPlugin(), contractPlugin()] }
 */
declare function classExtractPlugin(options?: Pick<PluginOptions, 'calleeNames'>): Plugin;
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
 * import { slotTransformPlugin, contractPlugin } from '@praxis-ui/vite-plugin'
 * export default { plugins: [slotTransformPlugin(), contractPlugin()] }
 */
declare function slotTransformPlugin(): Plugin;
/**
 * Vite plugin that replaces same-file polymorphic component usage sites with
 * direct element creation at build time, eliminating the runtime render
 * pipeline for statically-analyzable usages.
 *
 * **Requires classExtractPlugin to run first** so that `precomputedClasses` is
 * present in the factory call before this plugin reads it. Place after
 * `classExtractPlugin` in the plugins array.
 *
 * A usage site is inlined when:
 * - The component is defined in the same file with `precomputedClasses` injected
 * - No `as`, `asChild`, `render`, or spread attributes at the site
 * - All variant props are static string literals
 * - `className` is absent or a static string literal
 * - The factory config has no `defaults` or `enforcement`
 *
 * Sites that do not meet all conditions fall through to the normal runtime path
 * unchanged.
 *
 * @example
 * // vite.config.ts
 * import { classExtractPlugin, staticCompositionPlugin } from '@praxis-ui/vite-plugin'
 * export default { plugins: [classExtractPlugin(), staticCompositionPlugin()] }
 */
declare function staticCompositionPlugin(options?: Pick<PluginOptions, 'calleeNames'>): Plugin;
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
 * import { ssrOptimizePlugin, contractPlugin } from '@praxis-ui/vite-plugin'
 * export default { plugins: [ssrOptimizePlugin(), contractPlugin()] }
 */
declare function ssrOptimizePlugin(options?: Pick<PluginOptions, 'calleeNames'>): Plugin[];

export { type ComponentConstraint, type ComponentTokens, type DesignTokenManifest, type DesignTokensOptions, type Diagnostic, type PluginOptions, type StaticBound, analyze, buildManifest, buildPrecomputedClasses, classExtractPlugin, collectFileTokens, composeStatically, compoundPrunePlugin, contractPlugin, designTokensPlugin, injectPrecomputedClasses, pruneDeadCompounds, slotTransformPlugin, ssrOptimizePlugin, staticCompositionPlugin, transformAsChild };
