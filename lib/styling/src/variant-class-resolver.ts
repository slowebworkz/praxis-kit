import type { AnyRecord } from './types'

type CvaFn = (props: AnyRecord) => string

export class VariantClassResolver {
  readonly #cvaFn: CvaFn | null
  readonly #presetMap: Readonly<Record<string, AnyRecord>>
  readonly #cache = new Map<string, string>()
  readonly #cacheOrder = new Set<string>()

  constructor(cvaFn: CvaFn | null, presetMap?: Record<string, AnyRecord>) {
    this.#cvaFn = cvaFn ?? null
    this.#presetMap = Object.freeze(presetMap ?? {})
  }

  resolve({ props, variantKey }: { props: AnyRecord; variantKey: string | undefined }): string {
    // '__none__' distinguishes "no variantKey" from an empty-string key in the cache.
    const normalizedKey = variantKey ?? '__none__'
    const cacheKey = this.#createCacheKey(props, normalizedKey)

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

  #createCacheKey(props: AnyRecord, variantKey: string): string {
    const keys = Object.keys(props).sort()
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
