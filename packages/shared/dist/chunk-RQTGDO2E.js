import {
  isFunction
} from "./chunk-NYLYTMMJ.js";
import {
  isDefined
} from "./chunk-IVRDE7BY.js";
import {
  isRecord
} from "./chunk-ZWO565M7.js";

// src/guards/capabilities/is-capabilities.ts
function isCapability(value) {
  if (!isRecord(value)) return false;
  const { createClassPipeline, AriaEngine } = value;
  if (isDefined(createClassPipeline) && !isFunction(createClassPipeline)) return false;
  if (isDefined(AriaEngine) && !isFunction(AriaEngine)) return false;
  return true;
}
function isCapabilityMap(value) {
  if (!isRecord(value)) return false;
  return Object.values(value).every(isCapability);
}
function isCapabilities(value) {
  return isCapability(value);
}

export {
  isCapability,
  isCapabilityMap,
  isCapabilities
};
