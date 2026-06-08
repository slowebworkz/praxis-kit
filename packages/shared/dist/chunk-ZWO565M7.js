// src/guards/foundational/is-null.ts
function isNull(value) {
  return value === null;
}
function isNullish(value) {
  return isNull(value) || value === void 0;
}

// src/guards/foundational/is-object.ts
function isObject(value) {
  return !isNull(value) && typeof value === "object";
}

// src/guards/foundational/is-record.ts
function isRecord(value) {
  if (!isObject(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || isNull(proto);
}

export {
  isNull,
  isNullish,
  isObject,
  isRecord
};
