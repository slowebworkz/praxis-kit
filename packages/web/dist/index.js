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

// src/build-runtime.ts
function buildRuntime(options) {
  const normalized = {
    ...options,
    ...resolveAdapterCommonOptions(options, "PolymorphicElement", false)
  };
  const { filterProps: customFilter, enforcement } = normalized;
  const { runtime, ownedKeys } = buildCoreRuntime(normalized);
  const { childrenEvaluator } = buildEngines(
    normalized.strict,
    enforcement?.children,
    normalized.name
  );
  const filterProps = composeFilter(ownedKeys, customFilter);
  return {
    runtime,
    filterProps,
    strict: normalized.strict,
    ...childrenEvaluator !== void 0 && { childrenEvaluator }
  };
}

// src/render-to-string.ts
var ssrRegistry = /* @__PURE__ */ new WeakMap();
function registerForSsr(cls, bundle) {
  ssrRegistry.set(cls, { bundle });
}
function escapeAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function buildAttrString(attributes) {
  const parts = [];
  for (const key in attributes) {
    if (!Object.hasOwn(attributes, key)) continue;
    const value = attributes[key];
    if (value === false || value === null || value === void 0) continue;
    if (value === true) {
      parts.push(key);
    } else {
      parts.push(`${key}="${escapeAttr(String(value))}"`);
    }
  }
  return parts.length > 0 ? " " + parts.join(" ") : "";
}
function renderToString(component, props = {}, innerHTML = "") {
  const entry = ssrRegistry.get(component);
  if (!entry) {
    const name = component.name ?? "AnonymousComponent";
    throw new Error(
      `[renderToString] ${name} was not registered for SSR. Ensure it was created with createContractComponent from @praxis-ui/web.`
    );
  }
  const { bundle } = entry;
  const { as, className, variantKey, class: classAttr, ...rest } = props;
  const tag = bundle.runtime.resolveTag(as);
  const mergedProps = bundle.runtime.resolveProps(rest);
  const resolvedClass = bundle.runtime.resolveClasses(
    tag,
    mergedProps,
    className ?? classAttr,
    variantKey
  );
  const ariaResult = bundle.runtime.resolveAria(tag, mergedProps);
  const filtered = applyFilter(
    ariaResult.props,
    bundle.filterProps,
    bundle.runtime.options.variantKeys
  );
  const attrs = { ...filtered, class: resolvedClass || void 0 };
  const attrStr = buildAttrString(attrs);
  return `<${tag}${attrStr}>${innerHTML}</${tag}>`;
}

// src/create-contract-component.ts
function isObject(value) {
  return typeof value === "object" && value !== null;
}
function isLooseBundle(arg) {
  if (!isObject(arg)) return false;
  const { runtime, filterProps, childrenEvaluator } = arg;
  if (!isObject(runtime)) return false;
  if (!isObject(runtime["options"])) return false;
  if (typeof runtime["resolveTag"] !== "function" || typeof runtime["resolveProps"] !== "function" || typeof runtime["resolveClasses"] !== "function" || typeof runtime["resolveAria"] !== "function")
    return false;
  if (typeof filterProps !== "function") return false;
  if (childrenEvaluator !== void 0 && (!isObject(childrenEvaluator) || typeof childrenEvaluator["evaluate"] !== "function"))
    return false;
  return true;
}
function toLooseBundle(bundle) {
  if (!isLooseBundle(bundle)) {
    throw new Error("[createContractComponent] buildRuntime returned an unexpected shape.");
  }
  return bundle;
}
function resolveHostState(bundle, props) {
  const { as, className, variantKey, ...rest } = props;
  const tag = bundle.runtime.resolveTag(as);
  const mergedProps = bundle.runtime.resolveProps(rest);
  const resolvedClass = bundle.runtime.resolveClasses(
    tag,
    mergedProps,
    className,
    variantKey
  );
  const ariaResult = bundle.runtime.resolveAria(tag, mergedProps);
  const attributes = applyFilter(
    ariaResult.props,
    bundle.filterProps,
    bundle.runtime.options.variantKeys
  );
  return { className: resolvedClass, attributes };
}
function applyHostState(host, state, prevPipelineAttrs, incomingProps) {
  host.className = state.className;
  for (const key of prevPipelineAttrs) {
    if (!Object.hasOwn(state.attributes, key)) host.removeAttribute(key);
  }
  prevPipelineAttrs.clear();
  for (const key in incomingProps) {
    if (!Object.hasOwn(incomingProps, key)) continue;
    if (!key.startsWith("aria-") && key !== "role") continue;
    if (!Object.hasOwn(state.attributes, key)) host.removeAttribute(key);
  }
  for (const key in state.attributes) {
    if (!Object.hasOwn(state.attributes, key)) continue;
    const value = state.attributes[key];
    if (value === void 0 || value === null || value === false) {
      host.removeAttribute(key);
    } else if (value === true) {
      host.setAttribute(key, "");
      prevPipelineAttrs.add(key);
    } else {
      host.setAttribute(key, String(value));
      prevPipelineAttrs.add(key);
    }
  }
}
function createContractComponent(options) {
  const bundle = buildRuntime(options);
  const looseBundle = toLooseBundle(bundle);
  const variantKeys = options.styling?.variants ? Object.keys(options.styling.variants) : [];
  const observedAttrNames = ["as", "variant-key", "praxis-class", ...variantKeys];
  const BaseElement = typeof HTMLElement !== "undefined" ? HTMLElement : class {
  };
  class PolymorphicWebElement extends BaseElement {
    // Tracks keys set by the pipeline last run so stale ones are removed.
    _pipelineAttrs = /* @__PURE__ */ new Set();
    static get observedAttributes() {
      return observedAttrNames;
    }
    connectedCallback() {
      this._applyPraxis();
    }
    // Fires synchronously for every observed attribute change — no microtask
    // scheduling needed. The guard is implicit: this only fires for
    // observedAttributes, all of which are praxis-owned.
    attributeChangedCallback(_name, _old, _next) {
      if (this.isConnected) {
        this._applyPraxis();
      }
    }
    /** Re-runs the pipeline. Call after setting non-reactive attributes (aria-*, role, data-*). */
    update() {
      this._applyPraxis();
    }
    get _self() {
      return this;
    }
    _applyPraxis() {
      const self = this._self;
      if (bundle.childrenEvaluator) {
        bundle.childrenEvaluator.evaluate(Array.from(this.childNodes));
      }
      const observedSet = new Set(
        this.constructor.observedAttributes ?? []
      );
      const props = {};
      for (const attr of Array.from(this.attributes)) {
        if (attr.name === "class" || observedSet.has(attr.name)) continue;
        props[attr.name] = attr.value;
      }
      props["as"] = self.as ?? this.getAttribute("as") ?? void 0;
      props["variantKey"] = self.variantKey ?? this.getAttribute("variant-key") ?? void 0;
      props["className"] = self.praxisClass ?? this.getAttribute("praxis-class") ?? void 0;
      for (const key of variantKeys) {
        const val = self[key] ?? this.getAttribute(key);
        if (val != null) props[key] = val;
      }
      applyHostState(this, resolveHostState(looseBundle, props), this._pipelineAttrs, props);
    }
  }
  if (options.name) {
    Object.defineProperty(PolymorphicWebElement, "name", { value: options.name });
  }
  Object.defineProperty(PolymorphicWebElement, "strict", { value: bundle.strict });
  registerForSsr(PolymorphicWebElement, looseBundle);
  return PolymorphicWebElement;
}
export {
  createContractComponent,
  renderToString
};
