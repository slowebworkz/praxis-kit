// ─── Types ────────────────────────────────────────────────────────────────────

type OwnKey<T extends object> = string & keyof T

type Entry<T extends object> = {
  [K in OwnKey<T>]: [K, T[K]]
}[OwnKey<T>]

interface ItemCollection<T> {
  readonly length: number
  item(index: number): T | null
}

// ─── Generic iterable algorithms ──────────────────────────────────────────────

function find<T, R>(iterable: Iterable<T>, callback: (value: T) => R | null | undefined): R | null {
  for (const value of iterable) {
    const result = callback(value)

    if (result != null) {
      return result
    }
  }

  return null
}

function some<T>(iterable: Iterable<T>, predicate: (value: T) => boolean): boolean {
  for (const value of iterable) {
    if (predicate(value)) return true
  }
  return false
}

function every<T>(iterable: Iterable<T>, predicate: (value: T, index: number) => boolean): boolean {
  let index = 0

  for (const value of iterable) {
    if (!predicate(value, index++)) {
      return false
    }
  }

  return true
}

function* filter<T>(
  iterable: Iterable<T>,
  predicate: (value: T, index: number) => boolean,
): IterableIterator<T> {
  let index = 0

  for (const value of iterable) {
    if (predicate(value, index++)) {
      yield value
    }
  }
}

function* map<T, R>(
  iterable: Iterable<T>,
  callback: (value: T, index: number) => R,
): IterableIterator<R> {
  let index = 0

  for (const value of iterable) {
    yield callback(value, index++)
  }
}

function forEach<T>(iterable: Iterable<T>, callback: (value: T, index: number) => void): void {
  let index = 0

  for (const value of iterable) {
    callback(value, index++)
  }
}

function reduce<T, TResult>(
  iterable: Iterable<T>,
  initial: TResult,
  callback: (accumulator: TResult, value: T, index: number) => TResult,
): TResult {
  let accumulator = initial
  let index = 0

  for (const value of iterable) {
    accumulator = callback(accumulator, value, index++)
  }

  return accumulator
}

/**
 * Transforms an iterable into a Record.
 *
 * The callback returns a `[key, value]` tuple for each element. Returning
 * `null` aborts the collection and causes `collect()` to return `null`.
 */
function collect<T, K extends PropertyKey, V>(
  iterable: Iterable<T>,
  callback: (value: T, index: number) => readonly [K, V] | null,
): Record<K, V> | null {
  const result = {} as Record<K, V>

  let index = 0

  for (const value of iterable) {
    const entry = callback(value, index++)

    if (entry === null) {
      return null
    }

    result[entry[0]] = entry[1]
  }

  return result
}

// ─── Indexed algorithms ───────────────────────────────────────────────────────

function findLast<R>(
  value: string,
  callback: (char: string, index: number) => R | null | undefined,
): R | null

function findLast<T, R>(
  value: readonly T[],
  callback: (value: T, index: number) => R | null | undefined,
): R | null

function findLast<T, R>(
  value: string | readonly T[],
  callback: (value: string | T, index: number) => R | null | undefined,
): R | null {
  for (let index = value.length - 1; index >= 0; index--) {
    const result = callback(value[index]!, index)

    if (result != null) {
      return result
    }
  }

  return null
}

// ─── Iterable adapters ────────────────────────────────────────────────────────

export function* items<T>(collection: ItemCollection<T>): IterableIterator<T> {
  for (let i = 0; i < collection.length; i++) {
    const item = collection.item(i)

    if (item !== null) {
      yield item
    }
  }
}

function nodeList<T extends Element = Element>(list: NodeListOf<T>): Iterable<T> {
  return {
    *[Symbol.iterator]() {
      for (let i = 0; i < list.length; i++) {
        const node = list.item(i)

        if (node !== null) {
          yield node
        }
      }
    },
  }
}

function mapEntries<K, V>(m: ReadonlyMap<K, V>): IterableIterator<[K, V]> {
  return m.entries()
}

function set<T>(s: ReadonlySet<T>): IterableIterator<T> {
  return s.values()
}

// ─── Object internals ─────────────────────────────────────────────────────────

function hasOwn<T extends object>(object: T, key: PropertyKey): key is keyof T {
  return Object.hasOwn(object, key)
}

// ─── Object iterators ─────────────────────────────────────────────────────────

function* entries<T extends object>(object: T): IterableIterator<Entry<T>> {
  for (const key in object) {
    if (!hasOwn(object, key)) continue

    yield [key, object[key]] as Entry<T>
  }
}

function* keys<T extends object>(object: T): IterableIterator<OwnKey<T>> {
  for (const [key] of entries(object)) {
    yield key
  }
}

function* values<T extends object>(object: T): IterableIterator<T[OwnKey<T>]> {
  for (const [, value] of entries(object)) {
    yield value
  }
}

// ─── Object algorithms ────────────────────────────────────────────────────────

function mapValues<T extends object, U>(
  object: T,
  callback: <K extends OwnKey<T>>(value: T[K], key: K) => U,
): { [K in OwnKey<T>]: U } {
  const result = {} as { [K in OwnKey<T>]: U }

  for (const [key, value] of entries(object)) {
    result[key] = callback(value, key)
  }

  return result
}

function forEachEntry<T extends object>(
  object: T,
  callback: <K extends OwnKey<T>>(key: K, value: T[K]) => void,
): void {
  for (const [key, value] of entries(object)) {
    callback(key, value)
  }
}

function forEachKey<T extends object>(object: T, callback: (key: OwnKey<T>) => void): void {
  for (const key of keys(object)) {
    callback(key)
  }
}

function forEachValue<T extends object>(object: T, callback: (value: T[OwnKey<T>]) => void): void {
  for (const value of values(object)) {
    callback(value)
  }
}

function forEachSet<T>(s: ReadonlySet<T>, callback: (value: T) => void): void {
  for (const value of s) {
    callback(value)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const iterate = Object.freeze({
  entries,
  filter,
  find,
  findLast,
  forEach,
  forEachEntry,
  forEachKey,
  forEachSet,
  forEachValue,
  items,
  keys,
  map,
  mapEntries,
  mapValues,
  nodeList,
  reduce,
  collect,
  set,
  some,
  every,
  values,
})
