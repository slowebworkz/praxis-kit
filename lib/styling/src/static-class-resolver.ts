export class StaticClassResolver {
  readonly #baseClass: string
  readonly #cache = new Map<string, string>()
  readonly #resolveTag: (tag: string) => string

  constructor(
    baseClass: string | string[],
    tagMap?: Record<string, string | string[] | undefined>,
  ) {
    this.#baseClass = Array.isArray(baseClass) ? baseClass.join(' ') : baseClass

    this.#resolveTag = tagMap
      ? (tag) => {
          const extra = tagMap[tag]
          if (!extra) return this.#baseClass
          const extraStr = Array.isArray(extra) ? extra.join(' ') : extra
          return `${this.#baseClass} ${extraStr}`
        }
      : () => this.#baseClass
  }

  resolve(tag: unknown, skipTagMap = false): string {
    // When a preset (variantKey) is active it owns the visual treatment; tag-map overrides
    // would conflict with preset intent, so they are bypassed.
    if (typeof tag !== 'string' || skipTagMap) return this.#baseClass

    const cached = this.#cache.get(tag)
    if (cached !== undefined) {
      // Promote to MRU: delete + re-add moves key to Map insertion-order tail.
      this.#cache.delete(tag)
      this.#cache.set(tag, cached)
      return cached
    }

    const result = this.#resolveTag(tag)
    this.#cache.set(tag, result)

    if (this.#cache.size > 200) {
      const lru = this.#cache.keys().next().value
      if (lru !== undefined) this.#cache.delete(lru)
    }

    return result
  }
}
