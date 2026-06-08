import {
  isBoolean
} from "./chunk-I2TE33QK.js";
import {
  isArray
} from "./chunk-H44YPGSB.js";
import {
  isString
} from "./chunk-BF772XIC.js";
import {
  isObject,
  isRecord
} from "./chunk-ZWO565M7.js";

// src/guards/variants/is-variant-selection.ts
function isVariantSelection(value) {
  if (!isObject(value)) return false;
  return Object.keys(value).every(isString);
}

// src/guards/variants/is-preset-map.ts
function isPresetMap(value) {
  if (!isRecord(value)) return false;
  return Object.values(value).every(isVariantSelection);
}

// src/guards/variants/is-variant-condition.ts
function isVariantCondition(value) {
  if (isString(value) || isBoolean(value)) return true;
  if (!isArray(value)) return false;
  return value.every((v) => isString(v) || isBoolean(v));
}

// src/guards/variants/is-variant-map.ts
function isVariantMap(value) {
  if (!isRecord(value)) return false;
  return Object.values(value).every(isRecord);
}

export {
  isVariantSelection,
  isPresetMap,
  isVariantCondition,
  isVariantMap
};
