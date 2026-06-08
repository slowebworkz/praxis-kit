// src/create-contract-component.ts
import { LitElement, html } from "lit";

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
function normalizeOptions(options) {
  return {
    ...options,
    ...resolveAdapterCommonOptions(options, "PolymorphicElement", false)
  };
}
function buildRuntime(options) {
  const { filterProps: customFilter, enforcement } = options;
  const normalized = normalizeOptions(options);
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
      `[renderToString] ${name} was not registered for SSR. Ensure it was created with createContractComponent from @praxis-ui/lit.`
    );
  }
  const { bundle } = entry;
  const { as, className, variantKey, class: classAttr, ...rest } = props;
  const tag = bundle.runtime.resolveTag(as);
  const mergedProps = bundle.runtime.resolveProps(rest);
  const resolvedClass = bundle.runtime.resolveClasses(
    tag,
    mergedProps,
    // Accept both React-style className and HTML-native class
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
    if (!Object.hasOwn(state.attributes, key)) {
      host.removeAttribute(key);
    }
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
  const praxisProps = /* @__PURE__ */ new Set(["as", "variantKey", "praxisClass", ...variantKeys]);
  const staticProps = {
    as: { type: String, attribute: "as" },
    variantKey: { type: String, attribute: "variant-key" },
    // External className input — separate from the pipeline-output `class`
    // attribute so _applyPraxis can read it without a circular class→pipeline→class loop.
    praxisClass: { type: String, attribute: "praxis-class" }
  };
  for (const key of variantKeys) {
    staticProps[key] = { type: String, attribute: key };
  }
  class PolymorphicLitElement extends LitElement {
    // Tracks keys set by the pipeline last render so stale attrs are removed.
    _pipelineAttrs = /* @__PURE__ */ new Set();
    // Starts true so the first update always runs the pipeline regardless of
    // what triggered it. Cleared after _applyPraxis() and re-set only when a
    // praxis-owned property changes or requestUpdate() is called manually.
    _praxisDirty = true;
    static get properties() {
      return staticProps;
    }
    // Light DOM — class pipeline applies directly to the host element.
    createRenderRoot() {
      return this;
    }
    // Guard: only re-run the pipeline when a praxis-owned property changed or
    // when requestUpdate() was called manually (name === undefined — covers
    // both the initial connection and consumer-driven ARIA attribute updates).
    // Updates triggered by non-praxis reactive properties on a subclass are
    // skipped, avoiding redundant pipeline runs on unrelated state changes.
    requestUpdate(name, oldValue) {
      if (name === void 0 || praxisProps.has(name)) {
        this._praxisDirty = true;
      }
      super.requestUpdate(name, oldValue);
    }
    updated(changed) {
      super.updated(changed);
      if (this._praxisDirty) {
        this._praxisDirty = false;
        this._applyPraxis();
      }
    }
    // Single cast at the class boundary — Lit's finalize() installs the
    // reactive property getters/setters at runtime; this accessor exposes them
    // under the typed shape so _applyPraxis never needs to cast inline.
    get _self() {
      return this;
    }
    _applyPraxis() {
      const self = this._self;
      const props = {};
      for (const attr of Array.from(this.attributes)) {
        if (attr.name !== "class") props[attr.name] = attr.value;
      }
      props["as"] = self.as;
      props["variantKey"] = self.variantKey;
      props["className"] = self.praxisClass;
      for (const key of variantKeys) {
        const val = self[key];
        if (val != null) props[key] = val;
      }
      applyHostState(this, resolveHostState(looseBundle, props), this._pipelineAttrs, props);
    }
    render() {
      if (bundle.childrenEvaluator) {
        bundle.childrenEvaluator.evaluate(Array.from(this.childNodes));
      }
      return html`<slot></slot>`;
    }
  }
  if (options.name) {
    Object.defineProperty(PolymorphicLitElement, "name", { value: options.name });
  }
  registerForSsr(PolymorphicLitElement, looseBundle);
  return PolymorphicLitElement;
}
export {
  createContractComponent,
  renderToString
};
