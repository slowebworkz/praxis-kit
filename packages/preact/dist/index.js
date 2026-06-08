// src/create-contract-component.ts
import { forwardRef as forwardRef2 } from "preact/compat";

// src/normalize-children.ts
import { isValidElement } from "preact";
function normalizeChildren(children) {
  if (isValidElement(children)) return [children];
  if (Array.isArray(children)) return children.filter(isValidElement);
  return [];
}

// src/apply-display-name.ts
function applyDisplayName(component, name) {
  Object.assign(component, { displayName: name ?? "PolymorphicComponent" });
}

// ../../lib/adapter-utils/src/apply-filter.ts
function applyFilter(props, filterProps, variantKeys) {
  const out = {};
  for (const k in props) {
    if (!Object.hasOwn(props, k)) continue;
    if (filterProps(k, variantKeys)) continue;
    out[k] = props[k];
  }
  return out;
}

// ../../lib/adapter-utils/src/build-core-runtime.ts
import { createPolymorphic } from "@praxis-ui/core";
var EMPTY_SET = /* @__PURE__ */ new Set();
function buildCoreRuntime(normalized) {
  const runtime = createPolymorphic(normalized);
  const ownedKeys = "classPlugin" in runtime ? runtime.classPlugin.ownedKeys ?? EMPTY_SET : EMPTY_SET;
  return { runtime, ownedKeys };
}

// ../../lib/adapter-utils/src/build-engines.ts
import { ChildrenEvaluator } from "@praxis-ui/core";
function buildEngines(strict, childRules, context) {
  return childRules?.length ? { childrenEvaluator: new ChildrenEvaluator(childRules, strict, context) } : {};
}

// ../../lib/adapter-utils/src/compose-filter.ts
function composeFilter(ownedKeys, filterProps) {
  const defaultFilter = (key, variantKeys) => variantKeys.has(key) || ownedKeys.has(key);
  if (!filterProps) {
    return defaultFilter;
  }
  return (key, variantKeys) => defaultFilter(key, variantKeys) || filterProps(key, variantKeys);
}

// ../../lib/adapter-utils/src/resolve-adapter-common-options.ts
function resolveAdapterCommonOptions(options, defaultName = "PolymorphicComponent", defaultStrict = "throw") {
  return {
    name: options.name ?? defaultName,
    strict: options.enforcement?.strict ?? defaultStrict
  };
}

// ../../lib/adapter-utils/src/slot-validator.ts
import { StrictBase } from "@praxis-ui/core";
var SlotValidator = class extends StrictBase {
  #name;
  #elementTerm;
  constructor(name, strict, elementTerm) {
    super(strict);
    this.#name = name;
    this.#elementTerm = elementTerm;
  }
  assertExclusive() {
    this.violate(`${this.#name}: "as" and "asChild" are mutually exclusive`);
  }
  warnDiscardedChildren(count) {
    const suffix = count === 1 ? "" : "ren";
    this.warn(
      `${this.#name}: asChild discarded ${count} non-element child${suffix} \u2014 only ${this.#elementTerm}s are valid asChild children.`
    );
  }
  assertSingleChild(count) {
    const msg = count === 0 ? `${this.#name}: asChild requires a ${this.#elementTerm} child` : `${this.#name}: asChild requires exactly one ${this.#elementTerm} child, got ${count}`;
    this.violate(msg);
  }
};

// src/slot/Slot.tsx
import { forwardRef } from "preact/compat";

// ../shared/src/constants/primitive/event-handler-re.ts
var EVENT_HANDLER_RE = /^on[A-Z]/;

// ../shared/src/constants/primitive/slot-name.ts
var SLOT_NAME = "Slot";

// src/slot/applySlot.ts
import { isValidElement as isValidElement4 } from "preact";

// src/slot/invariant.ts
function panic(message) {
  throw new Error(message);
}
function invariant(condition, message) {
  if (!condition) panic(message);
}

// src/slot/extractSlottable.ts
import { h, Fragment as Fragment2, isValidElement as isValidElement3 } from "preact";

// src/slot/predicates.ts
import { isValidElement as isValidElement2 } from "preact";

// ../shared/src/guards/foundational/is-function.ts
function isFunction(value) {
  return typeof value === "function";
}

// ../shared/src/guards/foundational/is-null.ts
function isNull(value) {
  return value === null;
}

// ../shared/src/guards/foundational/is-object.ts
function isObject(value) {
  return !isNull(value) && typeof value === "object";
}

// ../shared/src/guards/foundational/is-record.ts
function isRecord(value) {
  if (!isObject(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || isNull(proto);
}

// src/slot/Slottable.tsx
import { Fragment } from "preact";
import { jsx } from "preact/jsx-runtime";
function Slottable({ children }) {
  return /* @__PURE__ */ jsx(Fragment, { children });
}

// src/slot/predicates.ts
function isSlottableElement(value) {
  return isValidElement2(value) && value.type === Slottable;
}
function isReactEventKey(key) {
  return EVENT_HANDLER_RE.test(key);
}

// src/slot/extractSlottable.ts
function extractSlottable(children) {
  const childrenArray = Array.isArray(children) ? children : [children];
  const slottables = childrenArray.filter(isSlottableElement);
  invariant(slottables.length <= 1, "Slot: multiple Slottable children are not allowed");
  if (slottables.length === 0) return null;
  const [slottable] = slottables;
  invariant(slottable, "Missing Slottable element");
  const child = slottable.props.children;
  invariant(
    child !== null && child !== void 0,
    "Slottable expects exactly one Preact element child, received null"
  );
  invariant(
    typeof child !== "string" && typeof child !== "number",
    "Slottable expects exactly one Preact element child, received text content"
  );
  invariant(isValidElement3(child), "Slottable expects exactly one Preact element child");
  invariant(child.type !== Fragment2, "Slottable child cannot be a Fragment");
  const index = childrenArray.indexOf(slottable);
  return {
    child,
    rebuild(merged) {
      const out = childrenArray.map((node, i) => i === index ? merged : node);
      return h(Fragment2, null, ...out);
    }
  };
}

// src/slot/applySlot.ts
function applySlot(children, slotProps, ref, cloneSlotChild2) {
  const extraction = extractSlottable(children);
  if (extraction) {
    const merged = cloneSlotChild2({ child: extraction.child, slotProps, ref });
    return extraction.rebuild(merged);
  }
  invariant(isValidElement4(children), "Slot: child must be a valid Preact element");
  return cloneSlotChild2({ child: children, slotProps, ref });
}

// src/slot/cloneSlotChild.ts
import { cloneElement, Fragment as Fragment3 } from "preact";

// src/slot/policies.ts
import { clsx } from "clsx";
function chainHandlers(childHandler, slotHandler) {
  return (...args) => {
    childHandler(...args);
    const event = args[0];
    if (!(typeof event === "object" && event !== null && "defaultPrevented" in event && event.defaultPrevented)) {
      slotHandler(...args);
    }
  };
}
function mergeClassNames(slot, child) {
  return clsx(slot, child);
}
function mergeStyles(slot, child) {
  if (!isRecord(slot) || !isRecord(child)) return child;
  return { ...slot, ...child };
}
var policyHandlers = {
  chain: (slotVal, childVal) => chainHandlers(childVal, slotVal),
  concat: (slotVal, childVal) => mergeClassNames(slotVal, childVal),
  "shallow-merge": (slotVal, childVal) => mergeStyles(slotVal, childVal),
  "child-wins": (_slotVal, childVal) => childVal
};

// src/slot/mergeProps.ts
function mergeProps(slotProps, childProps) {
  const merged = { ...slotProps };
  for (const key in childProps) {
    if (!Object.hasOwn(childProps, key)) continue;
    merged[key] = applyMergePolicy(key, slotProps[key], childProps[key]);
  }
  return merged;
}
function classifyProp(key, slotVal, childVal) {
  if (isReactEventKey(key) && isFunction(slotVal) && isFunction(childVal)) return "chain";
  if (key === "className") return "concat";
  if (key === "style") return "shallow-merge";
  return "child-wins";
}
function applyMergePolicy(key, slotVal, childVal) {
  return policyHandlers[classifyProp(key, slotVal, childVal)](slotVal, childVal);
}

// src/slot/composeRefs.ts
function mergeRefs(...refs) {
  const active = refs.filter((r) => r != null);
  if (active.length === 0) return null;
  if (active.length === 1) return active[0];
  return (value) => {
    for (const ref of active) {
      if (typeof ref === "function") {
        ref(value);
      } else {
        ref.current = value;
      }
    }
  };
}
function getChildRef(child) {
  const ref = child.ref;
  return ref ?? null;
}

// src/slot/cloneSlotChild.ts
function cloneSlotChild({ child, slotProps, ref }) {
  const childProps = child.props;
  const isFragment = child.type === Fragment3;
  const childRef = isFragment ? null : getChildRef(child);
  const mergedRef = isFragment ? null : mergeRefs(ref, childRef);
  const merged = mergeProps(slotProps, childProps);
  return cloneElement(child, mergedRef !== null ? { ...merged, ref: mergedRef } : merged);
}

// src/slot/Slot.tsx
var Slot = forwardRef(function Slot2({ children, ...slotProps }, ref) {
  return applySlot(children, slotProps, ref ?? null, cloneSlotChild);
});
Object.assign(Slot, { displayName: SLOT_NAME });

// src/slot/slot-validator.ts
var SlotValidator2 = class extends SlotValidator {
  constructor(name, strict) {
    super(name, strict, "Preact element");
  }
};

// src/build-runtime.ts
function normalizeOptions(options) {
  return {
    ...options,
    slotComponent: options.slotComponent ?? Slot,
    ...resolveAdapterCommonOptions(options)
  };
}
function buildRuntime(options) {
  const normalized = normalizeOptions(options);
  const { runtime, ownedKeys } = buildCoreRuntime(normalized);
  const slotValidator = new SlotValidator2(normalized.name, normalized.strict);
  const { childrenEvaluator } = buildEngines(
    normalized.strict,
    normalized.enforcement?.children,
    normalized.name
  );
  const filterProps = composeFilter(ownedKeys, normalized.filterProps);
  return {
    runtime,
    slotComponent: normalized.slotComponent,
    normalizeChildren,
    slotValidator,
    filterProps,
    ...childrenEvaluator !== void 0 && { childrenEvaluator }
  };
}

// src/render.ts
import { h as h2 } from "preact";
import { isKnownAriaRole } from "@praxis-ui/core";
function buildDirectives(as, asChild) {
  return {
    ...as !== void 0 && { as },
    ...asChild !== void 0 && { asChild }
  };
}
function buildRenderState(tag, directives, props, className, children) {
  const state = { tag, directives, props, className };
  if (children !== void 0) state.children = children;
  return state;
}
function resolveRenderState(runtime, props, filterProps) {
  const { as, asChild, children, className, variantKey, ...rest } = props;
  const tag = runtime.resolveTag(as);
  const mergedProps = runtime.resolveProps(rest);
  const resolvedClass = runtime.resolveClasses(tag, mergedProps, className, variantKey);
  const filteredProps = applyFilter(mergedProps, filterProps, runtime.options.variantKeys);
  return buildRenderState(tag, buildDirectives(as, asChild), filteredProps, resolvedClass, children);
}
function warnDiscardedChildren(originalChildren, normalizedChildren, validator) {
  if (!Array.isArray(originalChildren)) return;
  const discarded = originalChildren.length - normalizedChildren.length;
  if (discarded > 0) validator.warnDiscardedChildren(discarded);
}
function isSingleElementArray(arr) {
  return arr.length === 1;
}
function resolveSlotChildren(children, normalized, validator) {
  warnDiscardedChildren(children, normalized, validator);
  if (isSingleElementArray(normalized)) {
    return normalized[0];
  }
  if (normalized.length > 1 && normalized.some(isSlottableElement)) {
    return normalized;
  }
  validator.assertSingleChild(normalized.length);
  return null;
}
function validateSlotDirectives(directives, validator) {
  const { as, asChild } = directives;
  if (!asChild) return false;
  if (as !== void 0) {
    validator.assertExclusive();
    return false;
  }
  return true;
}
function resolveSlotRender(state, getNormalized, validator) {
  if (!validateSlotDirectives(state.directives, validator)) return null;
  const child = resolveSlotChildren(state.children, getNormalized(), validator);
  if (child === null) return null;
  return { child };
}
function renderResolvedSlot(slotComponent, state, resolved, ref) {
  return h2(slotComponent, {
    ...state.props,
    className: state.className,
    ref,
    children: resolved.child
  });
}
function tryRenderAsChild(state, ref, slotComponent, getNormalized, validator) {
  const resolved = resolveSlotRender(state, getNormalized, validator);
  if (resolved === null) return null;
  return renderResolvedSlot(slotComponent, state, resolved, ref);
}
function buildElementProps(props, className, ref, children) {
  const { role, ...rest } = props;
  return {
    ...rest,
    className,
    ref,
    ...children !== void 0 && { children },
    ...isKnownAriaRole(role) && { role }
  };
}
function renderIntrinsic(state, ref, runtime) {
  const elementProps = buildElementProps(state.props, state.className, ref, state.children);
  const domProps = typeof state.tag === "string" ? runtime.resolveAria(state.tag, elementProps).props : elementProps;
  return h2(state.tag, domProps);
}
function render({
  runtime,
  props,
  ref,
  slotComponent,
  normalizeChildren: normalizeChildren2,
  filterProps,
  slotValidator,
  childrenEvaluator
}) {
  const state = resolveRenderState(runtime, props, filterProps);
  let cached;
  const once = () => cached ??= normalizeChildren2(state.children);
  if (process.env.NODE_ENV !== "production") childrenEvaluator?.evaluate(once());
  const slotResult = tryRenderAsChild(state, ref, slotComponent, once, slotValidator);
  return slotResult ?? renderIntrinsic(state, ref, runtime);
}

// src/create-contract-component.ts
function createContractComponent(options) {
  const bundle = buildRuntime(options);
  const Component = forwardRef2(function Component2(props, ref) {
    return render({
      ...bundle,
      normalizeChildren,
      props,
      ref: ref ?? null
    });
  });
  applyDisplayName(Component, options.name);
  return Component;
}
export {
  Slottable,
  createContractComponent
};
