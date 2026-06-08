// ../../lib/primitive/src/tag/resolve-tag.ts
function resolveTag(defaultTag, as) {
  return as ?? defaultTag;
}
function makeResolveTag(defaultTag) {
  return function tag(as) {
    return as ?? defaultTag;
  };
}

// ../../lib/primitive/src/utils/assert-never.ts
function assertNever(value) {
  throw new Error(`Unexpected value: ${String(value)}`);
}

// ../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n;
}

// ../../lib/primitive/src/utils/cn.ts
function cn(...inputs) {
  return clsx(...inputs);
}

// ../../lib/primitive/src/utils/merge-props.ts
function mergeProps(defaultProps, props) {
  return {
    ...defaultProps ?? {},
    ...props
  };
}

// ../../lib/primitive/src/utils/is-object.ts
function isNull(value) {
  return value === null;
}
function isObject(value) {
  return !isNull(value) && typeof value === "object";
}

// src/options/resolve-factory-options.ts
var EMPTY_VARIANT_KEYS = /* @__PURE__ */ new Set();
function whenDefined(value, key) {
  return value === void 0 ? {} : { [key]: value };
}
function resolveFactoryOptions(options = {}) {
  const { styling, enforcement } = options;
  const variantKeys = styling?.variants === void 0 ? EMPTY_VARIANT_KEYS : new Set(Object.keys(styling.variants));
  return Object.freeze({
    defaultTag: options.tag ?? "div",
    strict: enforcement?.strict ?? false,
    variantKeys,
    ...whenDefined(options.name, "displayName"),
    ...options.defaults !== void 0 && { defaultProps: options.defaults },
    ...styling?.base !== void 0 && { baseClassName: styling.base },
    ...styling?.tags !== void 0 && { tagMap: styling.tags },
    ...styling?.presets !== void 0 && { presetMap: styling.presets },
    ...styling?.variants !== void 0 && { variants: styling.variants },
    ...styling?.defaults !== void 0 && { defaultVariants: styling.defaults },
    ...styling?.compounds !== void 0 && { compoundVariants: styling.compounds },
    ...enforcement?.aria !== void 0 && { ariaRules: enforcement.aria },
    ...enforcement?.children !== void 0 && { childRules: enforcement.children },
    ...styling?.precomputedClasses !== void 0 && {
      precomputedClasses: styling.precomputedClasses
    }
  });
}

// src/options/validate-factory-options.ts
function report(strict, message) {
  if (strict === false) return;
  if (strict === true || strict === "throw") throw new Error(message);
  console.warn(message);
}
function validateFactoryOptions(resolved) {
  const { strict } = resolved;
  if (strict === false) return;
  const name = resolved.displayName ?? "Component";
  const { variants } = resolved;
  const checkSelection = (label2, selection) => {
    const record = selection;
    for (const dim in record) {
      const value = record[dim];
      if (value === void 0 || value === null) continue;
      const states = variants?.[dim];
      if (!states) {
        report(strict, `${name}: ${label2} references unknown variant "${dim}".`);
        continue;
      }
      const stateKey = String(value);
      if (!(stateKey in states)) {
        report(
          strict,
          `${name}: ${label2} sets "${dim}" to unknown value "${stateKey}" (valid: ${Object.keys(states).join(", ")}).`
        );
      }
    }
  };
  const { presetMap } = resolved;
  if (presetMap) {
    for (const presetKey in presetMap) {
      checkSelection(`preset "${presetKey}"`, presetMap[presetKey]);
    }
  }
  if (resolved.defaultVariants) checkSelection("defaults", resolved.defaultVariants);
}

// src/options/validate-render-props.ts
var warned = /* @__PURE__ */ new Set();
var pendingAsyncWarns = /* @__PURE__ */ new Set();
var asyncWarnScheduled = false;
function flushAsyncWarns() {
  asyncWarnScheduled = false;
  const messages = [...pendingAsyncWarns];
  pendingAsyncWarns.clear();
  for (const msg of messages) {
    console.warn(msg);
  }
}
function report2(strict, message) {
  if (!strict) return;
  if (strict === true || strict === "throw") throw new Error(message);
  if (strict === "async-warn") {
    if (pendingAsyncWarns.has(message)) return;
    pendingAsyncWarns.add(message);
    if (!asyncWarnScheduled) {
      asyncWarnScheduled = true;
      queueMicrotask(flushAsyncWarns);
    }
    return;
  }
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}
function label(name) {
  return name ? `[${name}]` : "[createContractComponent]";
}
function validateRenderProps(options, props, presetKey) {
  const { strict, presetMap, variants, displayName } = options;
  if (!strict) return;
  const tag = label(displayName);
  if (presetKey !== void 0 && (!presetMap || !Object.hasOwn(presetMap, presetKey))) {
    report2(strict, `${tag} Unknown presetKey "${presetKey}" \u2014 no preset with that name exists.`);
  }
  if (variants) {
    for (const key in variants) {
      if (!Object.hasOwn(props, key)) continue;
      const value = props[key];
      if (value === void 0 || value === null) continue;
      const dim = variants[key];
      if (dim && !Object.hasOwn(dim, String(value))) {
        report2(
          strict,
          `${tag} Variant "${key}=${String(value)}" is not a defined value for the "${key}" dimension.`
        );
      }
    }
  }
}

// src/factory/plugin-invariants.ts
function panic(message) {
  throw new Error(message);
}
function assertPluginShape(result) {
  if (result === null || typeof result !== "object")
    panic(
      `[praxis-ui] Plugin factory must return an object with a 'pipeline' function. Got: ${result === null ? "null" : typeof result}.`
    );
  const plugin = result;
  if (typeof plugin.pipeline !== "function")
    panic(
      `[praxis-ui] Plugin factory return value is missing a 'pipeline' function. Got pipeline: ${typeof plugin.pipeline}.`
    );
}
function guardPipeline(pipeline) {
  if (process.env.NODE_ENV === "production") return pipeline;
  return function guardedPipeline(tag, props, className, variantKey) {
    const result = pipeline(tag, props, className, variantKey);
    if (typeof result !== "string")
      panic(`[praxis-ui] Plugin pipeline must return a string. Got: ${typeof result}.`);
    return result;
  };
}

// src/factory/create-polymorphic.ts
var NOOP_CLASS_PIPELINE = (_tag, _props, className) => className ?? "";
function resolveClassPipeline(options, resolved, strict, capabilities) {
  const factory = options.styling?.plugin;
  if (!factory) {
    const createClassPipeline = capabilities?.createClassPipeline;
    const classPipeline2 = createClassPipeline ? createClassPipeline(resolved) : NOOP_CLASS_PIPELINE;
    return { pluginResult: void 0, classPipeline: classPipeline2 };
  }
  const pluginResult = factory(resolved, strict);
  assertPluginShape(pluginResult);
  const classPipeline = guardPipeline(pluginResult.pipeline);
  return { pluginResult, classPipeline };
}
function createRuntimeMethods(resolved, classPipeline, engine) {
  return {
    resolveTag: makeResolveTag(resolved.defaultTag),
    resolveProps(props) {
      return mergeProps(resolved.defaultProps, props);
    },
    resolveClasses(tag, props, className, variantKey) {
      if (process.env.NODE_ENV !== "production") {
        validateRenderProps(resolved, props, variantKey);
      }
      return classPipeline(tag, props, className, variantKey);
    },
    resolveAria(tag, props) {
      if (!engine) return { props };
      const result = engine.validate(tag, props);
      return { props: result.props };
    }
  };
}
function createRuntimeObject(methods, resolved, pluginResult) {
  return pluginResult ? { ...methods, options: resolved, hasStyling: true, classPlugin: pluginResult } : { ...methods, options: resolved };
}
function createPolymorphic(options = {}, capabilities) {
  const resolved = resolveFactoryOptions(options);
  if (process.env.NODE_ENV !== "production") validateFactoryOptions(resolved);
  const { pluginResult, classPipeline } = resolveClassPipeline(
    options,
    resolved,
    resolved.strict,
    capabilities
  );
  const engine = options.enforcement !== void 0 && capabilities?.AriaEngine ? new capabilities.AriaEngine(
    resolved.strict,
    resolved.ariaRules?.length ? { rules: resolved.ariaRules } : void 0
  ) : null;
  const methods = createRuntimeMethods(resolved, classPipeline, engine);
  return createRuntimeObject(
    methods,
    resolved,
    pluginResult
  );
}

// ../shared/src/guards/foundational/is-string.ts
function isString(value) {
  return typeof value === "string";
}

// ../shared/src/guards/aria/has-role.ts
function hasRole(props) {
  return isString(props.role);
}

// ../shared/src/constants/aria/known-aria-roles.ts
var KNOWN_ARIA_ROLES = [
  "alert",
  "alertdialog",
  "application",
  "article",
  "banner",
  "blockquote",
  "button",
  "caption",
  "cell",
  "checkbox",
  "code",
  "columnheader",
  "combobox",
  "complementary",
  "contentinfo",
  "definition",
  "deletion",
  "dialog",
  "document",
  "emphasis",
  "feed",
  "figure",
  "form",
  "generic",
  "grid",
  "gridcell",
  "group",
  "heading",
  "img",
  "insertion",
  "link",
  "list",
  "listbox",
  "listitem",
  "log",
  "main",
  "marquee",
  "math",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "meter",
  "navigation",
  "none",
  "note",
  "option",
  "paragraph",
  "presentation",
  "progressbar",
  "radio",
  "radiogroup",
  "region",
  "row",
  "rowgroup",
  "rowheader",
  "scrollbar",
  "search",
  "searchbox",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "strong",
  "subscript",
  "superscript",
  "switch",
  "tab",
  "table",
  "tablist",
  "tabpanel",
  "term",
  "textbox",
  "time",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treegrid",
  "treeitem"
];
var KNOWN_ARIA_ROLES_SET = new Set(KNOWN_ARIA_ROLES);

// ../shared/src/constants/aria/global-aria-attributes.ts
var GLOBAL_ARIA_ATTRIBUTES = /* @__PURE__ */ new Set([
  "aria-atomic",
  "aria-busy",
  "aria-controls",
  "aria-current",
  "aria-describedby",
  "aria-details",
  "aria-disabled",
  "aria-errormessage",
  "aria-flowto",
  "aria-hidden",
  "aria-keyshortcuts",
  "aria-label",
  "aria-labelledby",
  "aria-live",
  "aria-owns",
  "aria-relevant",
  "aria-roledescription"
]);

// ../shared/src/constants/aria/implicit-role-record.ts
var IMPLICIT_ROLE_RECORD = {
  article: "article",
  aside: "complementary",
  footer: "contentinfo",
  header: "banner",
  main: "main",
  nav: "navigation",
  button: "button",
  a: "link",
  select: "listbox",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  ul: "list",
  ol: "list",
  li: "listitem",
  table: "table",
  tr: "row",
  td: "cell",
  th: "columnheader"
};
var STRONG_ROLES = [
  "main",
  "navigation",
  "complementary",
  "contentinfo",
  "banner"
];
var STANDALONE_ROLES = ["article"];
var STRONG_ROLES_SET = new Set(STRONG_ROLES);
var STANDALONE_ROLES_SET = new Set(STANDALONE_ROLES);

// ../shared/src/constants/aria/role-restricted-attributes.ts
var ROLE_RESTRICTED_ATTRIBUTES = /* @__PURE__ */ new Map([
  [
    "aria-activedescendant",
    /* @__PURE__ */ new Set([
      "application",
      "combobox",
      "grid",
      "group",
      "listbox",
      "menu",
      "menubar",
      "radiogroup",
      "spinbutton",
      "tablist",
      "toolbar",
      "textbox",
      "tree",
      "treegrid"
    ])
  ],
  ["aria-autocomplete", /* @__PURE__ */ new Set(["combobox", "searchbox", "textbox"])],
  [
    "aria-checked",
    /* @__PURE__ */ new Set(["checkbox", "menuitemcheckbox", "option", "radio", "switch", "treeitem"])
  ],
  ["aria-colcount", /* @__PURE__ */ new Set(["grid", "table", "treegrid"])],
  ["aria-colindex", /* @__PURE__ */ new Set(["cell", "columnheader", "gridcell", "row", "rowheader"])],
  ["aria-colspan", /* @__PURE__ */ new Set(["cell", "columnheader", "gridcell", "rowheader"])],
  [
    "aria-expanded",
    /* @__PURE__ */ new Set([
      "button",
      "combobox",
      "gridcell",
      "listbox",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "row",
      "rowheader",
      "tab",
      "treeitem"
    ])
  ],
  [
    "aria-haspopup",
    /* @__PURE__ */ new Set([
      "button",
      "combobox",
      "gridcell",
      "listbox",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "tab",
      "treeitem"
    ])
  ],
  ["aria-level", /* @__PURE__ */ new Set(["heading", "listitem", "row", "treeitem"])],
  ["aria-modal", /* @__PURE__ */ new Set(["alertdialog", "dialog"])],
  ["aria-multiline", /* @__PURE__ */ new Set(["textbox"])],
  ["aria-multiselectable", /* @__PURE__ */ new Set(["grid", "listbox", "tablist", "tree", "treegrid"])],
  [
    "aria-orientation",
    /* @__PURE__ */ new Set(["scrollbar", "select", "separator", "slider", "tablist", "toolbar", "tree"])
  ],
  ["aria-placeholder", /* @__PURE__ */ new Set(["searchbox", "textbox"])],
  [
    "aria-posinset",
    /* @__PURE__ */ new Set([
      "article",
      "listitem",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "option",
      "radio",
      "row",
      "tab"
    ])
  ],
  ["aria-pressed", /* @__PURE__ */ new Set(["button"])],
  [
    "aria-readonly",
    /* @__PURE__ */ new Set([
      "combobox",
      "grid",
      "gridcell",
      "listbox",
      "radiogroup",
      "slider",
      "spinbutton",
      "textbox",
      "tree",
      "treegrid"
    ])
  ],
  [
    "aria-required",
    /* @__PURE__ */ new Set([
      "combobox",
      "gridcell",
      "listbox",
      "radiogroup",
      "spinbutton",
      "textbox",
      "tree",
      "treegrid"
    ])
  ],
  ["aria-rowcount", /* @__PURE__ */ new Set(["grid", "table", "treegrid"])],
  ["aria-rowindex", /* @__PURE__ */ new Set(["cell", "columnheader", "gridcell", "row", "rowheader"])],
  ["aria-rowspan", /* @__PURE__ */ new Set(["cell", "columnheader", "gridcell", "rowheader"])],
  [
    "aria-selected",
    /* @__PURE__ */ new Set(["columnheader", "gridcell", "option", "row", "rowheader", "tab", "treeitem"])
  ],
  [
    "aria-setsize",
    /* @__PURE__ */ new Set([
      "article",
      "listitem",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "option",
      "radio",
      "row",
      "tab"
    ])
  ],
  ["aria-sort", /* @__PURE__ */ new Set(["columnheader", "rowheader"])],
  [
    "aria-valuemax",
    /* @__PURE__ */ new Set(["meter", "progressbar", "scrollbar", "separator", "slider", "spinbutton"])
  ],
  [
    "aria-valuemin",
    /* @__PURE__ */ new Set(["meter", "progressbar", "scrollbar", "separator", "slider", "spinbutton"])
  ],
  [
    "aria-valuenow",
    /* @__PURE__ */ new Set(["meter", "progressbar", "scrollbar", "separator", "slider", "spinbutton"])
  ],
  [
    "aria-valuetext",
    /* @__PURE__ */ new Set(["meter", "progressbar", "scrollbar", "separator", "slider", "spinbutton"])
  ]
]);

// ../shared/src/guards/foundational/is-defined.ts
function isUndefined(value) {
  return value === void 0;
}

// ../shared/src/guards/aria/is-aria-attribute.ts
function isGlobalAriaAttribute(attr) {
  return GLOBAL_ARIA_ATTRIBUTES.has(attr);
}
function isAriaAttributeValidForRole(attr, role) {
  const allowedRoles = ROLE_RESTRICTED_ATTRIBUTES.get(attr);
  if (isUndefined(allowedRoles)) return true;
  if (isUndefined(role)) return false;
  return allowedRoles.has(role);
}

// ../shared/src/guards/aria/is-aria-role.ts
function isStrongImplicitRole(tag) {
  if (!(tag in IMPLICIT_ROLE_RECORD)) return false;
  return STRONG_ROLES_SET.has(IMPLICIT_ROLE_RECORD[tag]);
}
function isStandaloneTag(tag) {
  if (!(tag in IMPLICIT_ROLE_RECORD)) return false;
  return STANDALONE_ROLES_SET.has(IMPLICIT_ROLE_RECORD[tag]);
}

// ../shared/src/guards/aria/is-invalid.ts
function isInvalid(result) {
  return result.valid === false;
}

// ../shared/src/guards/aria/is-known-aria-role.ts
function isKnownAriaRole(value) {
  return isString(value) && KNOWN_ARIA_ROLES_SET.has(value);
}

export {
  resolveTag,
  makeResolveTag,
  isObject,
  clsx,
  assertNever,
  cn,
  mergeProps,
  createPolymorphic,
  isString,
  hasRole,
  KNOWN_ARIA_ROLES,
  isGlobalAriaAttribute,
  isAriaAttributeValidForRole,
  isStrongImplicitRole,
  isStandaloneTag,
  isInvalid,
  isKnownAriaRole
};
