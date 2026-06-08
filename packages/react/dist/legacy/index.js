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
} from "../chunk-L3WQW7T5.js";

// src/legacy/create-aria-enforced-component.ts
import { createContractedPolymorphic } from "@praxis-ui/core/contract";
import { forwardRef as forwardRef2 } from "react";

// src/legacy/slot/Slot.tsx
import { forwardRef } from "react";

// src/legacy/slot/cloneSlotChild.ts
import { Fragment } from "react";

// src/legacy/slot/composeRefs.ts
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
  return hasWarningGetter(element, "ref") ? getPropsRef(element) : getElementRef(element);
}

// src/legacy/slot/cloneSlotChild.ts
function cloneSlotChild({ child, slotProps, ref }) {
  const childProps = child.props;
  const isFragment = child.type === Fragment;
  const childRef = isFragment ? null : getChildRef(child);
  const mergedRef = isFragment ? null : mergeRefs(ref, childRef);
  const merged = mergeProps(slotProps, childProps);
  return cloneWithProps(child, merged, mergedRef);
}

// src/legacy/slot/Slot.tsx
var Slot = forwardRef(function Slot2({ children, ...slotProps }, ref) {
  return applySlot(children, slotProps, ref, cloneSlotChild);
});
Slot.displayName = SLOT_NAME;

// src/legacy/normalize-children.ts
import { Children, isValidElement } from "react";
function normalizeChildren(children) {
  return Children.toArray(children).filter(isValidElement);
}

// src/legacy/create-aria-enforced-component.ts
function createAriaEnforcedComponent(options) {
  const name = options.name ?? "PolymorphicComponent";
  const strict = options.enforcement?.strict ?? "throw";
  const slotComponent = options.slotComponent ?? Slot;
  const runtime = createContractedPolymorphic(options);
  const filterProps = composeFilter(/* @__PURE__ */ new Set(), options.filterProps);
  const slotValidator = new SlotValidator(name, strict);
  const Component = forwardRef2(
    function PolymorphicComponent(props, ref) {
      return render({
        runtime,
        props,
        ref,
        slotComponent,
        normalizeChildren,
        filterProps,
        slotValidator
      });
    }
  );
  applyDisplayName(Component, name);
  return Component;
}

// src/legacy/create-children-enforced-component.ts
import { createPolymorphic } from "@praxis-ui/core/primitive";
import { forwardRef as forwardRef3 } from "react";
function createChildrenEnforcedComponent(options) {
  const name = options.name ?? "PolymorphicComponent";
  const strict = options.enforcement?.strict ?? "throw";
  const slotComponent = options.slotComponent ?? Slot;
  const runtime = createPolymorphic(options);
  const filterProps = composeFilter(/* @__PURE__ */ new Set(), options.filterProps);
  const slotValidator = new SlotValidator(name, strict);
  const { childrenEvaluator } = buildEngines(strict, options.enforcement?.children, name);
  const Component = forwardRef3(
    function PolymorphicComponent(props, ref) {
      return render({
        runtime,
        props,
        ref,
        slotComponent,
        normalizeChildren,
        filterProps,
        slotValidator,
        ...childrenEvaluator !== void 0 && { childrenEvaluator }
      });
    }
  );
  applyDisplayName(Component, name);
  return Component;
}

// src/legacy/create-contract-component.ts
import { forwardRef as forwardRef4 } from "react";
function createContractComponent(options) {
  const bundle = buildRuntime(
    options,
    Slot,
    normalizeChildren
  );
  const Component = forwardRef4(
    function PolymorphicComponent(props, ref) {
      return render({ ...bundle, props, ref });
    }
  );
  applyDisplayName(Component, options.name);
  return Component;
}

// src/legacy/create-contracted-component.ts
import { createContractedPolymorphic as createContractedPolymorphic2 } from "@praxis-ui/core/contract";
import { forwardRef as forwardRef5 } from "react";
function createContractedComponent(options) {
  const name = options.name ?? "PolymorphicComponent";
  const strict = options.enforcement?.strict ?? "throw";
  const slotComponent = options.slotComponent ?? Slot;
  const runtime = createContractedPolymorphic2(options);
  const filterProps = composeFilter(/* @__PURE__ */ new Set(), options.filterProps);
  const slotValidator = new SlotValidator(name, strict);
  const { childrenEvaluator } = buildEngines(strict, options.enforcement?.children, name);
  const Component = forwardRef5(
    function PolymorphicComponent(props, ref) {
      return render({
        runtime,
        props,
        ref,
        slotComponent,
        normalizeChildren,
        filterProps,
        slotValidator,
        ...childrenEvaluator !== void 0 && { childrenEvaluator }
      });
    }
  );
  applyDisplayName(Component, name);
  return Component;
}

// src/legacy/create-polymorphic-component.ts
import { createPolymorphic as createPolymorphic2 } from "@praxis-ui/core/primitive";
import { forwardRef as forwardRef6 } from "react";
function createPolymorphicComponent(options) {
  const name = options.name ?? "PolymorphicComponent";
  const slotComponent = options.slotComponent ?? Slot;
  const runtime = createPolymorphic2(options);
  const filterProps = composeFilter(/* @__PURE__ */ new Set(), options.filterProps);
  const slotValidator = new SlotValidator(name, "throw");
  const Component = forwardRef6(
    function PolymorphicComponent(props, ref) {
      return render({
        runtime,
        props,
        ref,
        slotComponent,
        normalizeChildren,
        filterProps,
        slotValidator
      });
    }
  );
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
