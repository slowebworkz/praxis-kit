export class StaticClassResolver {
  readonly #baseClass: string
  readonly #cache = new Map<string, string>()
  readonly #cacheOrder = new Set<string>()
  readonly #resolveTag: (tag: string) => string

  constructor(baseClass: string, tagMap?: Record<string, string | undefined>) {
    this.#baseClass = baseClass

    this.#resolveTag = tagMap
      ? (tag) => {
          const extra = tagMap[tag]
          return extra ? `${this.#baseClass} ${extra}` : this.#baseClass
        }
      : () => this.#baseClass
  }

  resolve(tag: unknown, skipTagMap = false): string {
    // When a preset (variantKey) is active it owns the visual treatment; tag-map overrides
    // would conflict with preset intent, so they are bypassed.
    if (typeof tag !== 'string' || skipTagMap) return this.#baseClass

    const cached = this.#cache.get(tag)
    if (cached !== undefined) {
      this.#cacheOrder.delete(tag)
      this.#cacheOrder.add(tag)
      return cached
    }

    const result = this.#resolveTag(tag)
    this.#cache.set(tag, result)
    this.#cacheOrder.add(tag)

    if (this.#cache.size > 200) {
      const lru = this.#cacheOrder.values().next().value
      if (lru) {
        this.#cacheOrder.delete(lru)
        this.#cache.delete(lru)
      }
    }

    return result
  }
}
