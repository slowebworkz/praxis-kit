import {
  AriaPolicyEngine,
  ChildrenEvaluator,
  StrictBase,
  colgroupContract,
  createResolverPipeline,
  detailsContract,
  diagnoseChildren,
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
import {
  createClassPipeline,
  diagnoseClassPipeline
} from "./chunk-Z6BFUTKV.js";
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

// src/diagnose.ts
function diagnose(options, tag, props, children, className, variantKey) {
  const classes = diagnoseClassPipeline(options, tag, props, className, variantKey);
  let aria;
  if (options.ariaRules?.length) {
    const engine = new AriaPolicyEngine(false, { rules: options.ariaRules });
    aria = engine.validate(tag, props).violations;
  } else {
    aria = AriaPolicyEngine.evaluate(tag, props).violations;
  }
  const childViolations = diagnoseChildren(options.childRules ?? [], children ?? []);
  return { classes, aria, children: childViolations };
}

// src/factory/create-polymorphic-full.ts
var FULL_CAPABILITIES = { createClassPipeline, AriaEngine: AriaPolicyEngine };
function createPolymorphic2(options = {}) {
  return createPolymorphic(options, FULL_CAPABILITIES);
}
export {
  AriaPolicyEngine,
  ChildrenEvaluator,
  KNOWN_ARIA_ROLES,
  StrictBase,
  assertNever,
  cn,
  colgroupContract,
  createClassPipeline,
  createPolymorphic2 as createPolymorphic,
  createResolverPipeline,
  detailsContract,
  diagnose,
  diagnoseChildren,
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
