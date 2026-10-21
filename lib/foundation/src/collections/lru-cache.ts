/**
 * A bounded cache that evicts the least recently used entry once `maxSize` is
 * exceeded. Backed by a single `Map`, relying on its insertion-order iteration:
 * `get()` promotes a hit to most-recently-used by deleting and re-inserting the
 * key (moving it to the tail), and `set()` evicts the head (oldest) key when
 * over capacity.
 *
 * Consolidates a pattern that was hand-rolled independently in three places
 * (`StaticClassResolver`, `VariantClassResolver`, `AriaPolicyEngine#planCache`)
 * before this existed.
 */
export class LRUCache<K, V> {
  readonly #maxSize: number
  readonly #store = new Map<K, V>()

  constructor(maxSize: number) {
    if (!Number.isInteger(maxSize) || maxSize < 1) {
      throw new RangeError('LRUCache maxSize must be a positive integer.')
    }
    this.#maxSize = maxSize
  }

  get(key: K): V | undefined {
    if (!this.#store.has(key)) return undefined
    // has()+get() (not a single get()-then-undefined-check) so a stored
    // `undefined` is still a hit, not treated as a miss.
    const value = this.#store.get(key)
    // Promote to MRU: delete + re-add moves key to Map insertion-order tail.
    this.#store.delete(key)
    this.#store.set(key, value as V)
    return value
  }

  set(key: K, value: V): void {
    // Delete first so an existing key is re-inserted at the tail (MRU), not left
    // at its old position.
    this.#store.delete(key)
    this.#store.set(key, value)
    if (this.#store.size > this.#maxSize) {
      const lru = this.#store.keys().next().value
      if (lru !== undefined) this.#store.delete(lru)
    }
  }

  has(key: K): boolean {
    return this.#store.has(key)
  }

  delete(key: K): boolean {
    return this.#store.delete(key)
  }

  get size(): number {
    return this.#store.size
  }

  clear(): void {
    this.#store.clear()
  }
}
