import {
  SLOT_NAME,
  SlotValidator,
  Slottable,
  applyDisplayName,
  applySlot,
  buildEngines,
  buildRuntime,
  cloneWithProps,
  composeFilter,
  isFunction,
  isRecord,
  mergeProps,
  mergeRefs,
  render
} from "./chunk-L3WQW7T5.js";

// src/current/create-aria-enforced-component.ts
import { createContractedPolymorphic } from "@praxis-ui/core/contract";

// src/current/slot/cloneSlotChild.ts
import { Fragment } from "react";

// src/current/slot/composeRefs.ts
function isReactWarningGetter(getter) {
  return isFunction(getter) && "isReactWarning" in getter;
}
function hasWarningGetter(obj, key) {
  return isRecord(obj) && isReactWarningGetter(Object.getOwnPropertyDescriptor(obj, key)?.get);
}
function getElementRef(element) {
  const el = element;
  return isRecord(el) ? el.ref ?? null : null;
}
function getPropsRef(element) {
  const props = element.props;
  return isRecord(props) ? props.ref ?? null : null;
}
function getChildRef(element) {
  return hasWarningGetter(element.props, "ref") ? getElementRef(element) : getPropsRef(element);
}

// src/current/slot/cloneSlotChild.ts
function cloneSlotChild({ child, slotProps, ref }) {
  const childProps = child.props;
  const isFragment = child.type === Fragment;
  const childRef = isFragment ? null : getChildRef(child);
  const mergedRef = isFragment ? null : mergeRefs(ref, childRef);
  const merged = mergeProps(slotProps, childProps);
  return cloneWithProps(child, merged, mergedRef);
}

// src/current/slot/Slot.tsx
function Slot({ ref = null, children, ...slotProps }) {
  return applySlot(children, slotProps, ref, cloneSlotChild);
}
Slot.displayName = SLOT_NAME;

// src/current/normalize-children.ts
import { isValidElement } from "react";
function normalizeChildren(children) {
  if (isValidElement(children)) return [children];
  if (Array.isArray(children)) return children.filter(isValidElement);
  return [];
}

// src/current/create-aria-enforced-component.ts
function createAriaEnforcedComponent(options) {
  const name = options.name ?? "PolymorphicComponent";
  const strict = options.enforcement?.strict ?? "throw";
  const slotComponent = options.slotComponent ?? Slot;
  const runtime = createContractedPolymorphic(options);
  const filterProps = composeFilter(/* @__PURE__ */ new Set(), options.filterProps);
  const slotValidator = new SlotValidator(name, strict);
  function Component({ ref, ...props }) {
    return render({
      runtime,
      props,
      ref: ref ?? null,
      slotComponent,
      normalizeChildren,
      filterProps,
      slotValidator
    });
  }
  applyDisplayName(Component, name);
  return Component;
}

// src/current/create-children-enforced-component.ts
import { createPolymorphic } from "@praxis-ui/core/primitive";
function createChildrenEnforcedComponent(options) {
  const name = options.name ?? "PolymorphicComponent";
  const strict = options.enforcement?.strict ?? "throw";
  const slotComponent = options.slotComponent ?? Slot;
  const runtime = createPolymorphic(options);
  const filterProps = composeFilter(/* @__PURE__ */ new Set(), options.filterProps);
  const slotValidator = new SlotValidator(name, strict);
  const { childrenEvaluator } = buildEngines(strict, options.enforcement?.children, name);
  function Component({ ref, ...props }) {
    return render({
      runtime,
      props,
      ref: ref ?? null,
      slotComponent,
      normalizeChildren,
      filterProps,
      slotValidator,
      ...childrenEvaluator !== void 0 && { childrenEvaluator }
    });
  }
  applyDisplayName(Component, name);
  return Component;
}

// src/current/create-contract-component.ts
function createContractComponent(options) {
  const bundle = buildRuntime(
    options,
    Slot,
    normalizeChildren
  );
  function Component({ ref, ...props }) {
    return render({ ...bundle, props, ref: ref ?? null });
  }
  applyDisplayName(Component, options.name);
  return Component;
}

// src/current/create-contracted-component.ts
import { createContractedPolymorphic as createContractedPolymorphic2 } from "@praxis-ui/core/contract";
function createContractedComponent(options) {
  const name = options.name ?? "PolymorphicComponent";
  const strict = options.enforcement?.strict ?? "throw";
  const slotComponent = options.slotComponent ?? Slot;
  const runtime = createContractedPolymorphic2(options);
  const filterProps = composeFilter(/* @__PURE__ */ new Set(), options.filterProps);
  const slotValidator = new SlotValidator(name, strict);
  const { childrenEvaluator } = buildEngines(strict, options.enforcement?.children, name);
  function Component({ ref, ...props }) {
    return render({
      runtime,
      props,
      ref: ref ?? null,
      slotComponent,
      normalizeChildren,
      filterProps,
      slotValidator,
      ...childrenEvaluator !== void 0 && { childrenEvaluator }
    });
  }
  applyDisplayName(Component, name);
  return Component;
}

// src/current/create-polymorphic-component.ts
import { createPolymorphic as createPolymorphic2 } from "@praxis-ui/core/primitive";
function createPolymorphicComponent(options) {
  const name = options.name ?? "PolymorphicComponent";
  const slotComponent = options.slotComponent ?? Slot;
  const runtime = createPolymorphic2(options);
  const filterProps = composeFilter(/* @__PURE__ */ new Set(), options.filterProps);
  const slotValidator = new SlotValidator(name, "throw");
  function Component({ ref, ...props }) {
    return render({
      runtime,
      props,
      ref: ref ?? null,
      slotComponent,
      normalizeChildren,
      filterProps,
      slotValidator
    });
  }
  applyDisplayName(Component, name);
  return Component;
}
export {
  Slot,
  Slottable,
  createAriaEnforcedComponent,
  createChildrenEnforcedComponent,
  createContractComponent,
  createContractedComponent,
  createPolymorphicComponent,
  mergeRefs
};
