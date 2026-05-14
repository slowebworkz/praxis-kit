export class StaticClassResolver {
  readonly #baseClass: string
  readonly #stringCache = new Map<string, string>()
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

    const cached = this.#stringCache.get(tag)
    if (cached !== undefined) return cached

    const result = this.#resolveTag(tag)
    this.#stringCache.set(tag, result)

    return result
  }
}
