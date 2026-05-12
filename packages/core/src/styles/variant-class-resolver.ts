type CvaFn = (props: Record<string, unknown>) => string

export class VariantClassResolver {
  readonly #cvaFn: CvaFn | null
  readonly #presetMap: Readonly<Record<string, Record<string, unknown>>>
  readonly #cache = new Map<string, string>()
  readonly #cacheOrder = new Set<string>()

  constructor(cvaFn: CvaFn | null, presetMap?: Record<string, Record<string, unknown>>) {
    this.#cvaFn = cvaFn ?? null
    this.#presetMap = Object.freeze(presetMap ?? {})
  }

  resolve({
    props,
    variantKey,
  }: {
    props: Record<string, unknown>
    variantKey: string | undefined
  }): string {
    const normalizedKey = variantKey ?? '__none__'
    const cacheKey = this.#createCacheKey(props, normalizedKey)

    const cached = this.#cache.get(cacheKey)
    if (cached !== undefined) {
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

  #compute(props: Record<string, unknown>, variantKey?: string): string {
    const preset = variantKey ? (this.#presetMap[variantKey] ?? {}) : {}

    if (!this.#cvaFn) return ''

    const variantLayer = this.#cvaFn({ ...preset, ...props })
    return variantLayer
  }

  #createCacheKey(props: Record<string, unknown>, variantKey: string): string {
    const entries = Object.entries(props).toSorted(([a], [b]) => a.localeCompare(b))
    const body = entries
      .map(([k, v]) => `${k}:${VariantClassResolver.#serializeValue(v)}`)
      .join('|')
    return `${variantKey}:${body}`
  }

  // Variant props are string | boolean | undefined. Prefix each type to prevent
  // collisions between e.g. the string "undefined" and an absent value.
  static #serializeValue(value: unknown): string {
    if (value === undefined) return 'u'
    if (value === null) return 'n'
    if (typeof value === 'boolean') return `b:${value}`
    if (typeof value === 'string') return `s:${value}`
    return `x:${String(value)}`
  }
}
