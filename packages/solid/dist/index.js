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

// src/slot/slot-validator.ts
import { StrictBase } from "@praxis-ui/core";
var SlotValidator = class extends StrictBase {
  #name;
  constructor(name, strict) {
    super(strict);
    this.#name = name;
  }
  assertExclusive() {
    this.violate(`${this.#name}: "as" and "asChild" are mutually exclusive`);
  }
  // Returns false (instead of throwing) when strict mode caps at warn, so callers can
  // fall through to a safe no-op render rather than calling an undefined render function.
  assertRenderFn(children) {
    if (typeof children !== "function") {
      this.violate(
        `${this.#name}: asChild requires a render function as children, got ${typeof children}`
      );
      return false;
    }
    return true;
  }
};

// src/build-runtime.ts
function normalizeOptions(options) {
  return { ...options, ...resolveAdapterCommonOptions(options) };
}
function buildRuntime(options) {
  const normalized = normalizeOptions(options);
  const { runtime, ownedKeys } = buildCoreRuntime(normalized);
  const { childrenEvaluator } = buildEngines(
    normalized.strict,
    normalized.enforcement?.children,
    normalized.name
  );
  const filterProps = composeFilter(ownedKeys, normalized.filterProps);
  const slotValidator = new SlotValidator(normalized.name, normalized.strict);
  return {
    runtime,
    filterProps,
    slotValidator,
    ...childrenEvaluator !== void 0 && { childrenEvaluator }
  };
}

// src/render.tsx
import { createEffect, createMemo, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { isKnownAriaRole } from "@praxis-ui/core";
import { jsx } from "solid-js/jsx-runtime";
var SPLIT_KEYS = ["as", "asChild", "children", "class", "variantKey", "ref"];
function toChildArray(children) {
  if (children === void 0 || children === null) return [];
  if (Array.isArray(children)) return children;
  return [children];
}
function buildElementProps(props, classStr, ref, children) {
  const { role, ...rest } = props;
  return {
    ...rest,
    class: classStr,
    ...ref !== void 0 && { ref },
    ...children !== void 0 && { children },
    ...isKnownAriaRole(role) && { role }
  };
}
function buildSlotProps(props, classStr, ref) {
  const { role, ...rest } = props;
  return {
    ...rest,
    class: classStr,
    ...ref !== void 0 && { ref },
    ...isKnownAriaRole(role) && { role }
  };
}
function resolveTag(runtime, as) {
  return runtime.resolveTag(as);
}
function resolveDomProps(tag, elementProps, runtime) {
  return typeof tag === "string" ? runtime.resolveAria(tag, elementProps).props : elementProps;
}
function tryRenderAsChild(known, filteredProps, resolvedClass, slotValidator) {
  if (!known.asChild) return null;
  if (known.as !== void 0) {
    slotValidator.assertExclusive();
    return null;
  }
  if (!slotValidator.assertRenderFn(known.children)) return null;
  const renderFn = known.children;
  return createMemo(
    () => renderFn(buildSlotProps(filteredProps(), resolvedClass(), known.ref))
  );
}
function render({
  runtime,
  props,
  filterProps,
  slotValidator,
  childrenEvaluator
}) {
  const [knownRaw, rest] = splitProps(props, SPLIT_KEYS);
  const known = knownRaw;
  const tag = createMemo(() => resolveTag(runtime, known.as));
  const mergedProps = createMemo(() => runtime.resolveProps(rest));
  const resolvedClass = createMemo(
    () => runtime.resolveClasses(
      tag(),
      mergedProps(),
      known.class,
      known.variantKey
    )
  );
  const filteredProps = createMemo(
    () => applyFilter(mergedProps(), filterProps, runtime.options.variantKeys)
  );
  if (process.env.NODE_ENV !== "production" && childrenEvaluator) {
    createEffect(() => childrenEvaluator.evaluate(toChildArray(known.children)));
  }
  const slotResult = tryRenderAsChild(known, filteredProps, resolvedClass, slotValidator);
  if (slotResult !== null) return slotResult;
  const domProps = createMemo(() => {
    const ep = buildElementProps(filteredProps(), resolvedClass(), known.ref, known.children);
    return resolveDomProps(tag(), ep, runtime);
  });
  return /* @__PURE__ */ jsx(Dynamic, { component: tag(), ...domProps() });
}

// src/create-contract-component.ts
function createContractComponent(options) {
  const bundle = buildRuntime(options);
  const Component = (props) => {
    return render({
      ...bundle,
      props
    });
  };
  applyDisplayName(Component, options.name);
  return Component;
}
export {
  createContractComponent
};
