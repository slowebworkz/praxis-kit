import {
  isNumber
} from "./chunk-MIDJHPG5.js";
import {
  isFunction
} from "./chunk-NYLYTMMJ.js";
import {
  isUndefined
} from "./chunk-IVRDE7BY.js";
import {
  isArray
} from "./chunk-H44YPGSB.js";
import {
  isString
} from "./chunk-BF772XIC.js";
import {
  isRecord
} from "./chunk-ZWO565M7.js";

// src/guards/contract/is-cardinality.ts
function isCardinality(value) {
  if (!isRecord(value)) return false;
  const kind = value["kind"];
  if (kind === "unbounded") return true;
  if (kind !== "bounded") return false;
  return isNumber(value["min"]) && isNumber(value["max"]);
}

// src/guards/contract/is-child-rule.ts
function isChildRule(value) {
  if (!isRecord(value)) return false;
  return isString(value["name"]) && isFunction(value["match"]);
}
function isNormalizedChildRule(value) {
  if (!isChildRule(value)) return false;
  return isCardinality(value["cardinality"]) && isString(value["position"]);
}

// src/guards/contract/is-component-constraint.ts
function isComponentConstraint(value) {
  if (!isRecord(value)) return false;
  const enforcement = value["enforcement"];
  if (isUndefined(enforcement)) return true;
  if (!isRecord(enforcement)) return false;
  const children = enforcement["children"];
  return isUndefined(children) || isArray(children);
}

// src/guards/contract/is-validation.ts
function isValidationViolation(value) {
  if (!isRecord(value)) return false;
  return isString(value["message"]) && isString(value["tag"]);
}
function isValidationResult(value) {
  if (!isRecord(value)) return false;
  return isRecord(value["props"]) && isArray(value["violations"]);
}

export {
  isCardinality,
  isChildRule,
  isNormalizedChildRule,
  isComponentConstraint,
  isValidationViolation,
  isValidationResult
};
