import type { AnyRecord } from './types'
import { iterate, LRUCache } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'

type CvaFn = (props: AnyRecord) => string

/**
 * Runtime CVA class resolution with LRU + precomputed-map caching.
 *
 * Distinct from `variant-pass/` — `createVariantPass` is a composable pipeline stage for
 * build-time / plugin use (a `VariantConfig` → classes function), while this is the memoized
 * runtime resolver `createClassPipeline` calls per render.
 *
 * The precomputed map (`compileVariantLookup`, injected by the vite plugin) covers the
 * **no-recipe** combinations only — its keys are variant props alone, whereas this resolver's
 * cache keys are `recipe | variant props`, so a recipe-active call never hits a precomputed
 * entry and falls through to `#compute`. Recipe resolution stays fully runtime by design.
 */
export class VariantClassResolver {
  readonly #cvaFn: CvaFn | null
  readonly #recipeMap: Readonly<StringMap<AnyRecord>>
  readonly #variantKeys: ReadonlySet<string> | null
  readonly #precomputedClasses: Readonly<StringMap<string>> | null
  readonly #cache = new LRUCache<string, string>(1000)

  constructor(
    cvaFn: CvaFn | null,
    recipeMap?: StringMap<AnyRecord>,
    variantKeys?: ReadonlySet<string>,
    precomputedClasses?: Readonly<StringMap<string>>,
  ) {
    this.#cvaFn = cvaFn ?? null
    this.#recipeMap = Object.freeze(recipeMap ?? {})
    this.#variantKeys = variantKeys ?? null
    this.#precomputedClasses = precomputedClasses ?? null
  }

  resolve({ props, recipe }: { props: AnyRecord; recipe: string | undefined }): string {
    // '__none__' distinguishes "no recipe" from an empty-string key in the cache.
    const normalizedKey = recipe ?? '__none__'
    const cacheKey = this.#createCacheKey(props, normalizedKey)

    // Precomputed map covers all statically-known combinations; injected by classExtractPlugin.
    if (this.#precomputedClasses !== null) {
      const precomputed = this.#precomputedClasses[cacheKey]
      if (precomputed !== undefined) return precomputed
    }

    const cached = this.#cache.get(cacheKey)
    if (cached !== undefined) return cached

    const result = this.#compute(props, recipe)
    this.#cache.set(cacheKey, result)
    return result
  }

  #compute(props: AnyRecord, recipe?: string): string {
    if (!this.#cvaFn) return ''
    // One recipe rule across the package: `undefined` is "no recipe", every string is a recipe
    // key (matches `createClassPipeline` / `StaticClassResolver` / `diagnoseClassPipeline`, all
    // of which test `recipe !== undefined`). A string with no matching preset still falls through
    // to the no-preset path — but not by being coerced falsy here.
    if (recipe === undefined) return this.#cvaFn(props)
    const preset = this.#recipeMap[recipe]
    if (!preset) return this.#cvaFn(props)
    return this.#cvaFn({ ...preset, ...props })
  }

  // When variantKeys is provided, only those keys are included in the cache key — non-variant
  // props (className, id, etc.) produce identical CVA output and must not fragment the cache.
  // Iterating #variantKeys directly (fixed Set insertion order) avoids Object.keys + filter + sort.
  // String is built incrementally to avoid a parts[] array allocation on every render.
  #createCacheKey(props: AnyRecord, recipe: string): string {
    if (this.#variantKeys !== null) {
      let key = recipe
      iterate.forEachSet(this.#variantKeys, (k) => {
        if (k in props) key += `|${k}:${VariantClassResolver.#serializeValue(props[k])}`
      })
      return key
    }
    let key = recipe
    iterate.forEach(Object.keys(props).sort(), (k) => {
      key += `|${k}:${VariantClassResolver.#serializeValue(props[k])}`
    })
    return key
  }

  static #serializeValue(value: unknown): string {
    if (value === undefined) return 'u'
    if (value === null) return 'n'
    if (typeof value === 'boolean') return `b:${value}`
    if (typeof value === 'string') return `s:${value}`
    return `x:${String(value)}`
  }
}
