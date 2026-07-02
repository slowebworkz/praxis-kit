import type { AnyRecord } from './types'
import { iterate } from '@praxis-kit/primitive'

type CvaFn = (props: AnyRecord) => string

export class VariantClassResolver {
  readonly #cvaFn: CvaFn | null
  readonly #recipeMap: Readonly<Record<string, AnyRecord>>
  readonly #variantKeys: ReadonlySet<string> | null
  readonly #precomputedClasses: Readonly<Record<string, string>> | null
  readonly #cache = new Map<string, string>()

  constructor(
    cvaFn: CvaFn | null,
    recipeMap?: Record<string, AnyRecord>,
    variantKeys?: ReadonlySet<string>,
    precomputedClasses?: Readonly<Record<string, string>>,
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
    if (cached !== undefined) {
      // Promote to MRU: delete + re-add moves key to Map insertion-order tail.
      this.#cache.delete(cacheKey)
      this.#cache.set(cacheKey, cached)
      return cached
    }

    const result = this.#compute(props, recipe)
    this.#cache.set(cacheKey, result)

    if (this.#cache.size > 1000) {
      const lru = this.#cache.keys().next().value
      if (lru !== undefined) this.#cache.delete(lru)
    }

    return result
  }

  #compute(props: AnyRecord, recipe?: string): string {
    if (!this.#cvaFn) return ''
    // No active preset — pass props directly; avoids a spread allocation.
    if (!recipe) return this.#cvaFn(props)
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
