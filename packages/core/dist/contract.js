import {
  AriaPolicyEngine,
  ChildrenEvaluator,
  StrictBase,
  colgroupContract,
  createResolverPipeline,
  detailsContract,
  dlContract,
  fieldsetContract,
  figureContract,
  getImplicitRole,
  htmlContracts,
  listContract,
  optgroupContract,
  pictureContract,
  selectContract,
  tableBodyContract,
  tableContract,
  tableRowContract
} from "./chunk-OFCMXCCV.js";
import "./chunk-MDQJQEF7.js";
import {
  KNOWN_ARIA_ROLES,
  assertNever,
  cn,
  createPolymorphic,
  hasRole,
  isAriaAttributeValidForRole,
  isGlobalAriaAttribute,
  isInvalid,
  isKnownAriaRole,
  isStandaloneTag,
  isStrongImplicitRole,
  makeResolveTag,
  mergeProps,
  resolveTag
} from "./chunk-RCIN4KIG.js";

// src/factory/create-polymorphic-contracted.ts
var CONTRACTED_CAPABILITIES = { AriaEngine: AriaPolicyEngine };
function createContractedPolymorphic(options = {}) {
  return createPolymorphic(options, CONTRACTED_CAPABILITIES);
}
export {
  AriaPolicyEngine,
  ChildrenEvaluator,
  KNOWN_ARIA_ROLES,
  StrictBase,
  assertNever,
  cn,
  colgroupContract,
  createContractedPolymorphic,
  createPolymorphic,
  createResolverPipeline,
  detailsContract,
  dlContract,
  fieldsetContract,
  figureContract,
  getImplicitRole,
  hasRole,
  htmlContracts,
  isAriaAttributeValidForRole,
  isGlobalAriaAttribute,
  isInvalid,
  isKnownAriaRole,
  isStandaloneTag,
  isStrongImplicitRole,
  listContract,
  makeResolveTag,
  mergeProps,
  optgroupContract,
  pictureContract,
  resolveTag,
  selectContract,
  tableBodyContract,
  tableContract,
  tableRowContract
};
