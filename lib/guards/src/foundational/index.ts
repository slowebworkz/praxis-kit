// The foundational runtime guards used across this package's children/ARIA/contract/variant
// domain guards, re-exported from `@praxis-kit/foundation`.
//
// They are implemented there, not here and not in `guardz`, so that the packages below this one in
// the dependency graph (`@praxis-kit/diagnostics`, `@praxis-kit/primitive`) can use them too, and so
// a bundler can tree-shake them: `guardz` is a CommonJS barrel that keeps all of itself when any one
// function is imported. See `lib/foundation/src/guards/foundational.ts` and `DECISIONS.md`.
export {
  isArray,
  isDefined,
  isEqualTo,
  isFalse,
  isFunction,
  isNil,
  isNonNull,
  isNonNullObject,
  isNull,
  isNullish,
  isNumber,
  isObject,
  isPlainObject,
  isRecord,
  isString,
  isTrue,
  isUndefined,
} from '@praxis-kit/foundation'
