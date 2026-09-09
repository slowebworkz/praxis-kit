// The foundational runtime guards live in @praxis-kit/foundation (a genuinely flat package, safe
// to import directly under Node's native ESM loader) — re-exported here so every existing consumer
// of @praxis-kit/primitive's public surface keeps working unchanged. `isPlainObject` is surfaced
// under primitive's historical name `isRecord`. See DECISIONS.md.
export {
  isArray,
  isBoolean,
  isDefined,
  isUndefined,
  isNull,
  isNonNull,
  isNullish,
  isFunction,
  isNumber,
  isObject,
  isString,
  isPlainObject as isRecord,
} from '@praxis-kit/foundation'
