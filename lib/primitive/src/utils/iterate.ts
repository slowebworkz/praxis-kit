function hasOwn<T extends object>(object: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function* keys<T extends object>(object: T): IterableIterator<keyof T> {
  for (const key in object) {
    if (!hasOwn(object, key)) continue
    yield key
  }
}

function* values<T extends object>(object: T): IterableIterator<T[keyof T]> {
  for (const key in object) {
    if (!hasOwn(object, key)) continue
    yield object[key]
  }
}

function* entries<T extends object>(
  object: T,
): IterableIterator<{ [K in keyof T]: [K, T[K]] }[keyof T]> {
  for (const key in object) {
    if (!hasOwn(object, key)) continue
    yield [key, object[key]] as { [K in keyof T]: [K, T[K]] }[keyof T]
  }
}

function forEachKey<T extends object>(object: T, callback: (key: keyof T) => void): void {
  for (const key of keys(object)) {
    callback(key)
  }
}

function forEachValue<T extends object>(object: T, callback: (value: T[keyof T]) => void): void {
  for (const value of values(object)) {
    callback(value)
  }
}

function forEachEntry<T extends object>(
  object: T,
  callback: <K extends keyof T>(key: K, value: T[K]) => void,
): void {
  for (const [key, value] of entries(object)) {
    callback(key, value)
  }
}

export const iterate = Object.freeze({
  keys,
  values,
  entries,
  forEachKey,
  forEachValue,
  forEachEntry,
})
