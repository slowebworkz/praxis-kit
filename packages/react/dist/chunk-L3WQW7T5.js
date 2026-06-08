// src/shared/merge-refs.ts
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

// src/shared/slot/Slottable.tsx
import { Fragment } from "react";
import { jsx } from "react/jsx-runtime";
function Slottable({ children }) {
  return /* @__PURE__ */ jsx(Fragment, { children });
}

// ../shared/src/constants/primitive/event-handler-re.ts
var EVENT_HANDLER_RE = /^on[A-Z]/;

// ../shared/src/constants/primitive/slot-name.ts
var SLOT_NAME = "Slot";

// src/shared/slot/clone.ts
import { cloneElement } from "react";
function cloneWithProps(child, props, ref) {
  return cloneElement(child, ref !== null ? { ...props, ref } : props);
}

// src/shared/slot/invariant.ts
function panic(message) {
  throw new Error(message);
}
function invariant(condition, message) {
  if (!condition) panic(message);
}

// src/shared/slot/applySlot.ts
import { isValidElement as isValidElement3 } from "react";

// src/shared/slot/extractSlottable.ts
import { createElement, Fragment as Fragment2, isValidElement as isValidElement2 } from "react";

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

// src/shared/slot/predicates.ts
import { isValidElement } from "react";
function isSlottableElement(value) {
  return isValidElement(value) && value.type === Slottable;
}
function isReactEventKey(key) {
  return EVENT_HANDLER_RE.test(key);
}

// src/shared/slot/extractSlottable.ts
function extractSlottable(children) {
  const childrenArray = Array.isArray(children) ? children : [children];
  const slottables = childrenArray.filter(isSlottableElement);
  invariant(slottables.length <= 1, "Slot: multiple Slottable children are not allowed");
  if (slottables.length === 0) {
    return null;
  }
  const [slottable] = slottables;
  invariant(slottable, "Missing Slottable element");
  const child = slottable.props.children;
  invariant(
    child !== null && child !== void 0,
    "Slottable expects exactly one React element child, received null"
  );
  invariant(
    typeof child !== "string" && typeof child !== "number",
    "Slottable expects exactly one React element child, received text content"
  );
  invariant(isValidElement2(child), "Slottable expects exactly one React element child");
  invariant(child.type !== Fragment2, "Slottable child cannot be a Fragment");
  const index = childrenArray.indexOf(slottable);
  return {
    child,
    // Fragment wrapper: Slot owns no DOM node; ref composition happens only on the merge target.
    rebuild(merged) {
      const out = childrenArray.map((node, i) => i === index ? merged : node);
      return createElement(Fragment2, null, ...out);
    }
  };
}

// src/shared/slot/applySlot.ts
function applySlot(children, slotProps, ref, cloneSlotChild) {
  const extraction = extractSlottable(children);
  if (extraction) {
    const merged = cloneSlotChild({ child: extraction.child, slotProps, ref });
    return extraction.rebuild(merged);
  }
  invariant(isValidElement3(children), "Slot: child must be a valid React element");
  return cloneSlotChild({ child: children, slotProps, ref });
}

// src/shared/slot/policies.ts
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

// src/shared/slot/mergeProps.ts
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

// src/shared/slot/slot-validator.ts
var SlotValidator2 = class extends SlotValidator {
  constructor(name, strict) {
    super(name, strict, "React element");
  }
};

// src/shared/build-runtime.ts
function normalizeOptions(options, defaultSlot) {
  return {
    ...options,
    slotComponent: options.slotComponent ?? defaultSlot,
    ...resolveAdapterCommonOptions(options)
  };
}
function buildRuntime(options, defaultSlot, normalizeChildren) {
  const normalized = normalizeOptions(options, defaultSlot);
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

// src/shared/apply-display-name.ts
function applyDisplayName(component, name) {
  Object.assign(component, { displayName: name ?? "PolymorphicComponent" });
}

// src/shared/render.ts
import { createElement as createElement2 } from "react";
import { jsx as jsx2 } from "react/jsx-runtime";
import { isKnownAriaRole } from "@praxis-ui/core/primitive";
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
  const { as, asChild, render: _render, children, className, variantKey, ...rest } = props;
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
  return jsx2(slotComponent, {
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
  return createElement2(state.tag, domProps);
}
function render({
  runtime,
  props,
  ref,
  slotComponent,
  normalizeChildren,
  filterProps,
  slotValidator,
  childrenEvaluator
}) {
  const state = resolveRenderState(runtime, props, filterProps);
  let cached;
  const once = () => cached ??= normalizeChildren(state.children);
  if (process.env.NODE_ENV !== "production") childrenEvaluator?.evaluate(once());
  if (typeof props.render === "function") {
    return props.render({ ...state.props, className: state.className, ref });
  }
  const slotResult = tryRenderAsChild(state, ref, slotComponent, once, slotValidator);
  return slotResult ?? renderIntrinsic(state, ref, runtime);
}

export {
  buildEngines,
  composeFilter,
  mergeRefs,
  SLOT_NAME,
  cloneWithProps,
  isFunction,
  isRecord,
  Slottable,
  applySlot,
  mergeProps,
  SlotValidator2 as SlotValidator,
  buildRuntime,
  applyDisplayName,
  render
};
