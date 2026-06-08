// src/guards/foundational/is-defined.ts
function isDefined(value) {
  return value !== void 0;
}
function isUndefined(value) {
  return value === void 0;
}

export {
  isDefined,
  isUndefined
};
