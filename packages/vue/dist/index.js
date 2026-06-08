// src/create-contract-component.ts
import { computed, defineComponent as defineComponent2 } from "vue";

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

// src/slot/invariant.ts
function panic(message) {
  throw new Error(message);
}
function invariant(condition, message) {
  if (!condition) panic(message);
}

// src/slot/slot-validator.ts
var SlotValidator2 = class extends SlotValidator {
  constructor(name, strict) {
    super(name, strict, "VNode");
  }
};

// src/slot/Slottable.ts
import { defineComponent, h, Fragment } from "vue";
var Slottable = defineComponent({
  name: "Slottable",
  setup(_, { slots }) {
    return () => h(Fragment, null, slots.default?.());
  }
});

// src/slot/extractSlottable.ts
import { h as h2, Fragment as Fragment2 } from "vue";
function isSlottableVNode(vnode) {
  return vnode.type === Slottable;
}
function extractSlottable(children) {
  const slottables = children.filter(isSlottableVNode);
  invariant(slottables.length <= 1, "Slot: multiple Slottable children are not allowed");
  if (slottables.length === 0) return null;
  const [slottable] = slottables;
  invariant(slottable !== void 0, "Slottable element is undefined");
  const slots = slottable.children;
  const defaultChildren = slots?.default?.() ?? [];
  invariant(
    defaultChildren.length === 1,
    `Slottable expects exactly one VNode child, received ${defaultChildren.length}`
  );
  const child = defaultChildren[0];
  invariant(child !== void 0, "Slottable child is undefined");
  const index = children.indexOf(slottable);
  return {
    child,
    rebuild(merged) {
      const out = children.map((node, i) => i === index ? merged : node);
      return h2(Fragment2, null, out);
    }
  };
}

// src/build-runtime.ts
function normalizeOptions(options) {
  return { ...options, ...resolveAdapterCommonOptions(options) };
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
    slotValidator,
    filterProps,
    ...childrenEvaluator !== void 0 && { childrenEvaluator }
  };
}

// src/render.ts
import { cloneVNode, h as h3 } from "vue";
import { isKnownAriaRole } from "@praxis-ui/core";

// src/normalize-children.ts
import { isVNode } from "vue";
function normalizeChildren(slots) {
  const raw = slots.default?.() ?? [];
  const vnodes = raw.filter(isVNode);
  return { vnodes, discarded: raw.length - vnodes.length };
}

// src/render.ts
function buildDirectives(as, asChild) {
  return {
    ...as !== void 0 && { as },
    ...asChild !== void 0 && { asChild }
  };
}
function resolveRenderState(runtime, attrs, filterProps) {
  const { as, asChild, class: className, variantKey, ...rest } = attrs;
  const tag = runtime.resolveTag(as);
  const mergedProps = runtime.resolveProps(rest);
  const resolvedClass = runtime.resolveClasses(
    tag,
    mergedProps,
    typeof className === "string" ? className : void 0,
    typeof variantKey === "string" ? variantKey : void 0
  );
  const filteredProps = applyFilter(mergedProps, filterProps, runtime.options.variantKeys);
  return {
    tag,
    directives: buildDirectives(as, asChild),
    className: resolvedClass,
    props: filteredProps
  };
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
function tryRenderAsChild(state, children, discarded, validator) {
  if (!validateSlotDirectives(state.directives, validator)) return null;
  if (discarded > 0) validator.warnDiscardedChildren(discarded);
  const extraction = extractSlottable(children);
  if (extraction) {
    const merged = cloneVNode(extraction.child, { ...state.props, class: state.className });
    return extraction.rebuild(merged);
  }
  if (children.length === 1) {
    const child = children[0];
    if (child === void 0) return null;
    return cloneVNode(child, { ...state.props, class: state.className });
  }
  validator.assertSingleChild(children.length);
  return null;
}
var MULTI_WORD_EVENT_RE = /^on[A-Z][a-z]+[A-Z]/;
function normalizeEventKeys(props) {
  const out = {};
  for (const k in props) {
    out[MULTI_WORD_EVENT_RE.test(k) ? "on" + k.slice(2).toLowerCase() : k] = props[k];
  }
  return out;
}
function buildDomProps(runtime, props, className, tag) {
  const { role, ...rest } = normalizeEventKeys(props);
  const base = {
    ...rest,
    class: className,
    ...isKnownAriaRole(role) && { role }
  };
  if (typeof tag !== "string") return base;
  const validated = runtime.resolveAria(tag, base);
  const {
    className: _className,
    ref: _ref,
    children: _children,
    ...validatedRest
  } = validated.props;
  return { ...validatedRest, class: className };
}
function render({
  runtime,
  attrs,
  slots,
  filterProps,
  slotValidator,
  childrenEvaluator,
  resolvedState
}) {
  const state = resolvedState ?? resolveRenderState(runtime, attrs, filterProps);
  const { vnodes: children, discarded } = normalizeChildren(slots);
  if (process.env.NODE_ENV !== "production") childrenEvaluator?.evaluate(children);
  const slotResult = tryRenderAsChild(state, children, discarded, slotValidator);
  if (slotResult !== null) return slotResult;
  const domProps = buildDomProps(runtime, state.props, state.className, state.tag);
  return h3(state.tag, domProps, slots.default ? { default: slots.default } : void 0);
}

// src/create-contract-component.ts
function createContractComponent(options) {
  const bundle = buildRuntime(options);
  const Component = defineComponent2({
    name: options.name ?? "PolymorphicComponent",
    // Without inheritAttrs: false Vue would double-bind attrs onto the root element
    // before our render pipeline has a chance to filter, transform, and re-apply them.
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const resolvedState = computed(
        () => resolveRenderState(bundle.runtime, attrs, bundle.filterProps)
      );
      return () => render({ ...bundle, attrs, slots, resolvedState: resolvedState.value });
    }
  });
  applyDisplayName(Component, options.name);
  return Component;
}
export {
  Slottable,
  createContractComponent
};
