type OwnKey<T extends object> = string & keyof T

type Entry<T extends object> = {
  [K in OwnKey<T>]: [K, T[K]]
}[OwnKey<T>]

interface ItemCollection<T> {
  readonly length: number
  item(index: number): T | null
}

export function* items<T>(collection: ItemCollection<T>): IterableIterator<T> {
  for (let i = 0; i < collection.length; i++) {
    const item = collection.item(i)

    if (item !== null) {
      yield item
    }
  }
}

function* entries<T extends object>(object: T): IterableIterator<Entry<T>> {
  for (const key in object) {
    if (!key) continue

    if (!Object.hasOwn(object, key)) continue

    yield [key, object[key]] as Entry<T>
  }
}

function* keys<T extends object>(object: T): IterableIterator<OwnKey<T>> {
  for (const [key] of entries(object)) {
    if (key === undefined) continue
    yield key
  }
}

function* values<T extends object>(object: T): IterableIterator<T[OwnKey<T>]> {
  for (const [, value] of entries(object)) {
    yield value
  }
}

function forEachEntry<T extends object>(
  object: T,
  callback: <K extends OwnKey<T>>(key: K, value: T[K]) => void,
): void {
  for (const [key, value] of entries(object)) {
    if (key === undefined) continue
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

function forEachArray<T>(arr: readonly T[], callback: (value: T) => void): void {
  for (const value of arr) {
    callback(value)
  }
}

function forEachItem<T>(collection: ItemCollection<T>, callback: (item: T) => void): void {
  for (const item of items(collection)) {
    callback(item)
  }
}

function array<T>(arr: readonly T[]): Iterable<T> {
  return arr
}

function map<K, V>(m: ReadonlyMap<K, V>): IterableIterator<[K, V]> {
  return m.entries()
}

function set<T>(s: ReadonlySet<T>): IterableIterator<T> {
  return s.values()
}

function nodeList<T extends Element = Element>(list: NodeListOf<T>): Iterable<T> {
  return {
    *[Symbol.iterator]() {
      for (let i = 0; i < list.length; i++) {
        const node = list.item(i)
        if (node !== null) yield node
      }
    },
  }
}

export const iterate = Object.freeze({
  entries,
  keys,
  values,
  forEachEntry,
  forEachKey,
  forEachValue,
  forEachArray,
  forEachItem,
  array,
  map,
  set,
  nodeList,
  items,
})
