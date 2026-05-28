import type { AnyRecord } from './types'

type CvaFn = (props: AnyRecord) => string

export class VariantClassResolver {
  readonly #cvaFn: CvaFn | null
  readonly #presetMap: Readonly<Record<string, AnyRecord>>
  readonly #variantKeys: ReadonlySet<string> | null
  readonly #precomputedClasses: Readonly<Record<string, string>> | null
  readonly #cache = new Map<string, string>()
  readonly #cacheOrder = new Set<string>()

  constructor(
    cvaFn: CvaFn | null,
    presetMap?: Record<string, AnyRecord>,
    variantKeys?: ReadonlySet<string>,
    precomputedClasses?: Readonly<Record<string, string>>,
  ) {
    this.#cvaFn = cvaFn ?? null
    this.#presetMap = Object.freeze(presetMap ?? {})
    this.#variantKeys = variantKeys ?? null
    this.#precomputedClasses = precomputedClasses ?? null
  }

  resolve({ props, variantKey }: { props: AnyRecord; variantKey: string | undefined }): string {
    // '__none__' distinguishes "no variantKey" from an empty-string key in the cache.
    const normalizedKey = variantKey ?? '__none__'
    const cacheKey = this.#createCacheKey(props, normalizedKey)

    // Precomputed map covers all statically-known combinations; injected by classExtractPlugin.
    if (this.#precomputedClasses !== null) {
      const precomputed = this.#precomputedClasses[cacheKey]
      if (precomputed !== undefined) return precomputed
    }

    const cached = this.#cache.get(cacheKey)
    if (cached !== undefined) {
      // Promote to MRU: delete then re-add moves the key to the tail of Set iteration order.
      this.#cacheOrder.delete(cacheKey)
      this.#cacheOrder.add(cacheKey)
      return cached
    }

    const result = this.#compute(props, variantKey)

    this.#cache.set(cacheKey, result)
    this.#cacheOrder.add(cacheKey)

    if (this.#cache.size > 1000) {
      const first = this.#cacheOrder.values().next().value
      if (first) {
        this.#cacheOrder.delete(first)
        this.#cache.delete(first)
      }
    }

    return result
  }

  #compute(props: AnyRecord, variantKey?: string): string {
    const preset = variantKey ? (this.#presetMap[variantKey] ?? {}) : {}

    if (!this.#cvaFn) return ''

    const variantLayer = this.#cvaFn({ ...preset, ...props })
    return variantLayer
  }

  // When variantKeys is provided, only those keys are included in the cache key — non-variant
  // props (className, id, etc.) produce identical CVA output and must not fragment the cache.
  #createCacheKey(props: AnyRecord, variantKey: string): string {
    const keys =
      this.#variantKeys !== null
        ? Object.keys(props)
            .filter((k) => (this.#variantKeys as ReadonlySet<string>).has(k))
            .sort()
        : Object.keys(props).sort()
    const parts: string[] = []
    for (const k of keys) {
      parts.push(`${k}:${VariantClassResolver.#serializeValue(props[k])}`)
    }
    return `${variantKey}:${parts.join('|')}`
  }

  static #serializeValue(value: unknown): string {
    if (value === undefined) return 'u'
    if (value === null) return 'n'
    if (typeof value === 'boolean') return `b:${value}`
    if (typeof value === 'string') return `s:${value}`
    return `x:${String(value)}`
  }
}
