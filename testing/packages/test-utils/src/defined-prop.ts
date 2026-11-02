/**
 * `{ [key]: value }` when `value` is defined, else `{}` — for spreading an optional prop into an
 * object under `exactOptionalPropertyTypes`, where `{ as: undefined }` is not assignable to an
 * optional `as`. Only `undefined` is dropped; `null` and other falsy values are kept.
 */
export function definedProp<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return value === undefined ? {} : ({ [key]: value } as { [P in K]?: V })
}
