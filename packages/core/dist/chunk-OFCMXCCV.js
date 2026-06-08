import {
  assertNever,
  isAriaAttributeValidForRole,
  isGlobalAriaAttribute,
  isObject,
  isStandaloneTag,
  isString,
  isStrongImplicitRole,
  mergeProps,
  resolveTag
} from "./chunk-RCIN4KIG.js";

// src/html/contracts.ts
function isTag(...tags) {
  const set = new Set(tags);
  return (child) => child !== null && typeof child === "object" && "type" in child && typeof child.type === "string" && set.has(child.type);
}
function isFlowContent(...blockedTags) {
  const set = new Set(blockedTags);
  return (child) => child !== null && typeof child === "object" && "type" in child && (typeof child.type !== "string" || !set.has(child.type));
}
var METADATA_TAGS = ["script", "template"];
function metadata() {
  return { name: "metadata", match: isTag(...METADATA_TAGS) };
}
var listContract = {
  strict: "warn",
  children: [{ name: "list-item", match: isTag("li", ...METADATA_TAGS) }]
};
var tableContract = {
  strict: "warn",
  children: [
    { name: "caption", match: isTag("caption"), cardinality: { max: 1 }, position: "first" },
    { name: "colgroup", match: isTag("colgroup") },
    { name: "thead", match: isTag("thead"), cardinality: { max: 1 } },
    { name: "tbody", match: isTag("tbody") },
    { name: "tfoot", match: isTag("tfoot"), cardinality: { max: 1 } },
    { name: "table-row", match: isTag("tr", ...METADATA_TAGS) }
  ]
};
var tableBodyContract = {
  strict: "warn",
  children: [{ name: "table-row", match: isTag("tr", ...METADATA_TAGS) }]
};
var tableRowContract = {
  strict: "warn",
  children: [{ name: "table-cell", match: isTag("td", "th", ...METADATA_TAGS) }]
};
var colgroupContract = {
  strict: "warn",
  children: [{ name: "column", match: isTag("col", "template") }]
};
var dlContract = {
  strict: "warn",
  children: [
    { name: "term", match: isTag("dt") },
    { name: "description", match: isTag("dd") },
    { name: "group", match: isTag("div") },
    metadata()
  ]
};
var selectContract = {
  strict: "warn",
  children: [{ name: "option", match: isTag("option", "optgroup", "hr", ...METADATA_TAGS) }]
};
var optgroupContract = {
  strict: "warn",
  children: [{ name: "option", match: isTag("option", ...METADATA_TAGS) }]
};
var pictureContract = {
  strict: "warn",
  children: [
    { name: "source", match: isTag("source", ...METADATA_TAGS) },
    { name: "image", match: isTag("img"), cardinality: { min: 1, max: 1 } }
  ]
};
var figureContract = {
  strict: "warn",
  children: [
    { name: "caption", match: isTag("figcaption"), cardinality: { max: 1 } },
    { name: "content", match: isFlowContent("figcaption") }
  ]
};
var detailsContract = {
  strict: "warn",
  children: [
    { name: "summary", match: isTag("summary"), cardinality: { max: 1 }, position: "first" },
    { name: "content", match: isFlowContent("summary") }
  ]
};
var fieldsetContract = {
  strict: "warn",
  children: [
    { name: "legend", match: isTag("legend"), cardinality: { max: 1 }, position: "first" },
    { name: "content", match: isFlowContent("legend") }
  ]
};
var menuContract = {
  strict: "warn",
  children: [{ name: "menu-item", match: isTag("li", ...METADATA_TAGS) }]
};
var datalistContract = {
  strict: "warn",
  children: [{ name: "option", match: isTag("option", ...METADATA_TAGS) }]
};
var audioContract = {
  strict: "warn",
  children: [
    { name: "source", match: isTag("source") },
    { name: "track", match: isTag("track") },
    { name: "content", match: isFlowContent("source", "track") }
  ]
};
var videoContract = {
  strict: "warn",
  children: [
    { name: "source", match: isTag("source") },
    { name: "track", match: isTag("track") },
    { name: "content", match: isFlowContent("source", "track") }
  ]
};
var headContract = {
  strict: "warn",
  children: [
    {
      name: "metadata",
      match: isTag("base", "link", "meta", "noscript", "script", "style", "template", "title")
    }
  ]
};
var htmlContract = {
  strict: "warn",
  children: [
    {
      name: "head",
      match: isTag("head"),
      cardinality: { min: 1, max: 1 },
      position: "first"
    },
    {
      name: "body",
      match: isTag("body"),
      cardinality: { min: 1, max: 1 }
    }
  ]
};
var buttonContract = {
  strict: "warn",
  children: [
    {
      name: "interactive-content",
      match: isTag("a", "button", "input", "select", "textarea", "details")
    }
  ]
};
var htmlContracts = {
  ul: listContract,
  ol: listContract,
  menu: menuContract,
  datalist: datalistContract,
  audio: audioContract,
  video: videoContract,
  table: tableContract,
  thead: tableBodyContract,
  tbody: tableBodyContract,
  tfoot: tableBodyContract,
  tr: tableRowContract,
  colgroup: colgroupContract,
  dl: dlContract,
  select: selectContract,
  optgroup: optgroupContract,
  picture: pictureContract,
  figure: figureContract,
  details: detailsContract,
  fieldset: fieldsetContract,
  head: headContract,
  html: htmlContract
};

// ../../lib/contract/src/aria/aria-role-policy.ts
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
function getImplicitRole(tag) {
  if (tag in IMPLICIT_ROLE_RECORD) return IMPLICIT_ROLE_RECORD[tag];
  return void 0;
}

// ../../lib/contract/src/strict/strict-base.ts
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
function scheduleAsyncWarn(message) {
  if (pendingAsyncWarns.has(message)) return;
  pendingAsyncWarns.add(message);
  if (!asyncWarnScheduled) {
    asyncWarnScheduled = true;
    queueMicrotask(flushAsyncWarns);
  }
}
var StrictBase = class {
  strict;
  constructor(strict) {
    this.strict = strict;
  }
  violate(message) {
    if (this.strict === true || this.strict === "throw") {
      throw new Error(message);
    }
    this.warn(message);
  }
  // Always caps at console.warn — never throws. ARIA 'warning' violations route here
  // so they surface even in strict='throw' mode without aborting a render.
  warn(message) {
    if (!this.strict) return;
    if (this.strict === "async-warn") {
      scheduleAsyncWarn(message);
      return;
    }
    console.warn(message);
  }
  invariant(condition, message) {
    if (!condition) {
      this.violate(message);
    }
  }
};

// ../shared/src/guards/foundational/is-null.ts
function isNull(value) {
  return value === null;
}

// ../shared/src/guards/foundational/is-number.ts
function isNumber(value) {
  return typeof value === "number";
}

// ../../lib/contract/src/aria/polymorphic-validator.ts
var VALID = [{ valid: true }];
function isIntrinsicTag(tag) {
  return isString(tag);
}
function omitProp(obj, key) {
  const { [key]: _, ...rest } = obj;
  return rest;
}
var AriaPolicyEngine = class _AriaPolicyEngine extends StrictBase {
  #extraRules;
  #planCache = /* @__PURE__ */ new Map();
  static #MAX_CACHE = 100;
  // Memoized AriaFix objects keyed by attribute name — the ARIA attribute set is
  // finite so this Map is bounded and avoids recreating closures on every cache miss.
  static #removeAttributeFixCache = /* @__PURE__ */ new Map();
  constructor(strict = "warn", options) {
    super(strict);
    this.#extraRules = options?.rules ?? [];
  }
  static #normalizeEmptyRole(tag, props) {
    if (props.role !== "") return { normalized: false };
    return {
      normalized: true,
      result: {
        props: omitProp(props, "role"),
        violations: [
          {
            message: `<${tag}> has an explicit empty role="". Omit the attribute instead.`,
            tag,
            role: "",
            attribute: void 0,
            severity: "warning",
            phase: "evaluate"
          }
        ]
      }
    };
  }
  static #deriveContext(tag, props) {
    if (!isIntrinsicTag(tag)) return { proceed: false, result: { props, violations: [] } };
    const implicitRole = getImplicitRole(tag);
    const hasExplicitLiveRole = !implicitRole && _AriaPolicyEngine.#LIVE_REGION_ROLES.has(props.role ?? "");
    if (!implicitRole && !hasExplicitLiveRole)
      return { proceed: false, result: { props, violations: [] } };
    const normalized = _AriaPolicyEngine.#normalizeEmptyRole(tag, props);
    if (normalized.normalized) return { proceed: false, result: normalized.result };
    const effectiveRole = props.role ?? implicitRole;
    return {
      proceed: true,
      tag,
      implicitRole,
      effectiveRole,
      context: { tag, props, implicitRole, effectiveRole }
    };
  }
  static #runRules(rules, context) {
    const violations = [];
    const fixes = [];
    for (const rule of rules) {
      for (const result of rule(context)) {
        if (!result.valid) {
          violations.push({
            message: result.message ?? `Invalid role "${context.props.role}" on <${context.tag}>`,
            tag: context.tag,
            role: context.props.role,
            attribute: result.attribute,
            severity: result.severity,
            phase: "evaluate"
          });
          if (result.fixable) fixes.push(result.fix);
        }
      }
    }
    return { violations, fixes };
  }
  static #getRules(context) {
    return _AriaPolicyEngine.#hasRole(context.props) ? _AriaPolicyEngine.#pipeline : [_AriaPolicyEngine.#checkInvalidAriaAttributes];
  }
  static evaluate(tag, props) {
    const derived = _AriaPolicyEngine.#deriveContext(tag, props);
    if (!derived.proceed) return derived.result;
    const { tag: narrowedTag, implicitRole, context } = derived;
    const { violations, fixes } = _AriaPolicyEngine.#runRules(
      _AriaPolicyEngine.#getRules(context),
      context
    );
    const next = _AriaPolicyEngine.#applyFixes(narrowedTag, implicitRole, props, fixes);
    return { props: next, violations };
  }
  static #evaluateWithRules(tag, props, extraRules) {
    const derived = _AriaPolicyEngine.#deriveContext(tag, props);
    if (!derived.proceed) return derived.result;
    const { tag: narrowedTag, implicitRole, context } = derived;
    const { violations, fixes } = _AriaPolicyEngine.#runRules(
      [..._AriaPolicyEngine.#getRules(context), ...extraRules],
      context
    );
    const next = _AriaPolicyEngine.#applyFixes(narrowedTag, implicitRole, props, fixes);
    return { props: next, violations };
  }
  report(violations) {
    for (const v of violations) {
      if (v.severity === "error") this.violate(v.message);
      else this.warn(v.message);
    }
  }
  // Cache key covers only the aria-relevant subset of props (tag + role + aria-* attrs).
  // Non-aria props (className, onClick, etc.) do not affect ARIA decisions and are excluded
  // so cache hits survive re-renders that only change non-aria props.
  // Note: #extraRules are NOT included in the key — each engine instance has its own Map,
  // so two engines with different rules never share cache entries. If caching ever becomes
  // static/shared, rule identity would need to be folded into the key.
  static #createPlanKey(tag, props) {
    if (!isIntrinsicTag(tag)) return null;
    const parts = [tag];
    if (typeof props.role === "string") parts.push(`role:${props.role}`);
    const ariaEntries = [];
    for (const k in props) {
      if (!Object.hasOwn(props, k) || !k.startsWith("aria-")) continue;
      const v = props[k];
      if (!isString(v) && !isNumber(v) && typeof v !== "boolean") continue;
      ariaEntries.push(`${k}:${String(v)}`);
    }
    if (ariaEntries.length > 0) parts.push(...ariaEntries.sort());
    return parts.join("|");
  }
  static #computePlan(inputProps, resultProps) {
    const removals = /* @__PURE__ */ new Set();
    const updates = {};
    for (const key in inputProps) {
      if (Object.hasOwn(inputProps, key) && !(key in resultProps)) removals.add(key);
    }
    for (const key in resultProps) {
      if (!Object.hasOwn(resultProps, key)) continue;
      const resultVal = resultProps[key];
      if (inputProps[key] !== resultVal) updates[key] = resultVal;
    }
    return { removals, updates };
  }
  static #applyPlan(props, removals, updates) {
    const hasRemovals = removals.size > 0;
    const hasUpdates = Object.keys(updates).length > 0;
    if (!hasRemovals && !hasUpdates) return props;
    const next = {};
    for (const k in props) {
      if (Object.hasOwn(props, k) && !removals.has(k)) next[k] = props[k];
    }
    Object.assign(next, updates);
    return next;
  }
  validate(tag, props) {
    const key = _AriaPolicyEngine.#createPlanKey(tag, props);
    if (!isNull(key)) {
      const cached = this.#planCache.get(key);
      if (cached !== void 0) {
        this.#planCache.delete(key);
        this.#planCache.set(key, cached);
        if (cached.violations.length > 0) this.report(cached.violations);
        return {
          props: _AriaPolicyEngine.#applyPlan(props, cached.removals, cached.updates),
          violations: cached.violations
        };
      }
    }
    const result = this.#extraRules.length ? _AriaPolicyEngine.#evaluateWithRules(tag, props, this.#extraRules) : _AriaPolicyEngine.evaluate(tag, props);
    if (result.violations.length > 0) this.report(result.violations);
    if (!isNull(key)) {
      const { removals, updates } = _AriaPolicyEngine.#computePlan(
        props,
        result.props
      );
      const plan = { removals, updates, violations: result.violations };
      this.#planCache.set(key, plan);
      if (this.#planCache.size > _AriaPolicyEngine.#MAX_CACHE) {
        const lru = this.#planCache.keys().next().value;
        if (lru !== void 0) this.#planCache.delete(lru);
      }
    }
    return result;
  }
  static #hasRole(props) {
    return isString(props.role) && props.role.length > 0;
  }
  static #applyFixes(tag, implicitRole, props, fixes) {
    if (fixes.length === 0) return props;
    const sorted = [...fixes].sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity));
    let next = props;
    for (const { apply } of sorted) {
      const effectiveRole = next.role ?? implicitRole;
      const fixContext = { tag, implicitRole, effectiveRole, props: next };
      const fixResult = apply(fixContext);
      if (fixResult.applied) next = fixResult.next;
    }
    return next;
  }
  static #removeRole = {
    kind: "removeRole",
    apply: ({ props }) => {
      if (!("role" in props)) return { applied: false, next: props };
      return { applied: true, next: omitProp(props, "role"), previous: props };
    }
  };
  static #makeRemoveAttributeFix(attr) {
    const cached = _AriaPolicyEngine.#removeAttributeFixCache.get(attr);
    if (cached) return cached;
    const fix = {
      kind: `removeAttribute:${attr}`,
      apply: ({ props }) => {
        if (!(attr in props)) return { applied: false, next: props };
        return { applied: true, next: omitProp(props, attr), previous: props };
      }
    };
    _AriaPolicyEngine.#removeAttributeFixCache.set(attr, fix);
    return fix;
  }
  // Snapshot diagnostic model: all rules evaluate against the same (tag, props, implicitRole) snapshot.
  static #pipeline = [
    _AriaPolicyEngine.#checkInvalidRoleOverride,
    _AriaPolicyEngine.#checkRedundantRole,
    _AriaPolicyEngine.#checkStandaloneRegion,
    _AriaPolicyEngine.#checkInvalidAriaAttributes,
    _AriaPolicyEngine.#checkMissingLiveRegion,
    _AriaPolicyEngine.#checkMissingAtomic,
    _AriaPolicyEngine.#checkInvalidAriaRelevant
  ];
  static #checkInvalidRoleOverride({
    tag,
    props,
    implicitRole
  }) {
    const role = props.role;
    if (!implicitRole || !role || role === implicitRole) return VALID;
    if (isStrongImplicitRole(tag) && role === "region") {
      return [
        {
          valid: false,
          fixable: true,
          severity: "error",
          fix: _AriaPolicyEngine.#removeRole,
          message: `<${tag}> should not override its implicit role="${implicitRole}" with role="${role}".`
        }
      ];
    }
    return VALID;
  }
  static #checkRedundantRole({ tag, props, implicitRole }) {
    const role = props.role;
    if (!implicitRole || !role || role !== implicitRole) return VALID;
    return [
      {
        valid: false,
        fixable: true,
        severity: "warning",
        fix: _AriaPolicyEngine.#removeRole,
        message: `<${tag}> already has implicit role="${implicitRole}". Avoid redundant role assignment.`
      }
    ];
  }
  static #checkStandaloneRegion({ tag, props, implicitRole }) {
    const role = props.role;
    if (role !== "region") return VALID;
    if (!isStandaloneTag(tag)) return VALID;
    return [
      {
        valid: false,
        fixable: true,
        severity: "error",
        fix: _AriaPolicyEngine.#removeRole,
        message: `<${tag}> is a self-contained element with implicit role="${implicitRole}". Assigning role="region" has been removed.`
      }
    ];
  }
  static #checkInvalidAriaAttributes({
    tag,
    props,
    effectiveRole
  }) {
    const results = [];
    for (const key in props) {
      if (!Object.hasOwn(props, key)) continue;
      if (!key.startsWith("aria-")) continue;
      if (isGlobalAriaAttribute(key)) continue;
      if (isAriaAttributeValidForRole(key, effectiveRole)) continue;
      results.push({
        valid: false,
        severity: "warning",
        fixable: true,
        attribute: key,
        message: `"${key}" is not valid on role="${effectiveRole ?? tag}". It will be removed.`,
        fix: _AriaPolicyEngine.#makeRemoveAttributeFix(key)
      });
    }
    return results;
  }
  // WAI-ARIA live region roles and their implied aria-live politeness values.
  static #LIVE_REGION_ROLES = /* @__PURE__ */ new Map([
    ["alert", "assertive"],
    ["status", "polite"],
    ["log", "polite"],
    ["timer", "off"]
  ]);
  static #checkMissingLiveRegion({ effectiveRole, props }) {
    if (!effectiveRole) return VALID;
    const impliedLive = _AriaPolicyEngine.#LIVE_REGION_ROLES.get(effectiveRole);
    if (!impliedLive) return VALID;
    if ("aria-live" in props) return VALID;
    const injectLive = {
      kind: `injectLive:${effectiveRole}`,
      apply: (ctx) => ({
        applied: true,
        next: { ...ctx.props, "aria-live": impliedLive },
        previous: ctx.props
      })
    };
    return [
      {
        valid: false,
        fixable: true,
        severity: "warning",
        fix: injectLive,
        message: `role="${effectiveRole}" implies aria-live="${impliedLive}" but it is missing. It has been injected.`
      }
    ];
  }
  static #checkMissingAtomic({ effectiveRole, props }) {
    if (!effectiveRole || !_AriaPolicyEngine.#LIVE_REGION_ROLES.has(effectiveRole)) return VALID;
    if ("aria-atomic" in props) return VALID;
    return [
      {
        valid: false,
        fixable: false,
        severity: "warning",
        message: `role="${effectiveRole}" is a live region. Consider setting aria-atomic="true" if the full region should be announced as a unit, or aria-atomic="false" if only changed nodes should be read.`
      }
    ];
  }
  static #VALID_RELEVANT_TOKENS = /* @__PURE__ */ new Set(["additions", "removals", "text", "all"]);
  // Custom fix rules passed via `options.rules` must be pure functions of (tag, props) — the cache
  // replays stored fixes against new prop objects, so fixes that close over external state will
  // produce inconsistent results on cache hits.
  static #normalizeRelevantAllFix = {
    kind: "normalizeRelevantAll",
    apply: ({ props: p }) => ({
      applied: true,
      next: { ...p, "aria-relevant": "all" },
      previous: p
    })
  };
  static #checkInvalidAriaRelevant({ props }) {
    const relevant = props["aria-relevant"];
    if (relevant === void 0) return VALID;
    if (typeof relevant !== "string") return VALID;
    const tokens = relevant.trim().split(/\s+/);
    const invalid = tokens.filter((t) => !_AriaPolicyEngine.#VALID_RELEVANT_TOKENS.has(t));
    if (invalid.length > 0) {
      return [
        {
          valid: false,
          fixable: true,
          severity: "warning",
          attribute: "aria-relevant",
          message: `aria-relevant contains invalid token(s): ${invalid.map((t) => `"${t}"`).join(", ")}. Valid tokens are: additions, removals, text, all.`,
          fix: _AriaPolicyEngine.#makeRemoveAttributeFix("aria-relevant")
        }
      ];
    }
    if (tokens.includes("all") && tokens.length > 1) {
      return [
        {
          valid: false,
          fixable: true,
          severity: "warning",
          attribute: "aria-relevant",
          message: `aria-relevant includes "all" alongside other tokens. "all" supersedes additions, removals, and text \u2014 use aria-relevant="all" alone.`,
          fix: _AriaPolicyEngine.#normalizeRelevantAllFix
        }
      ];
    }
    return VALID;
  }
};

// ../../lib/contract/src/children/get-type-name.ts
function getTypeName(value) {
  if (value === null) return "null";
  if (value === void 0) return "undefined";
  const primitive = typeof value;
  if (primitive !== "object") {
    return primitive;
  }
  const name = value.constructor?.name;
  return typeof name === "string" && name !== "Object" ? name : "object";
}

// ../../lib/contract/src/children/match-validation-error-builder.ts
var MatchValidationErrorBuilder = class {
  #prefix;
  constructor(ctx = "") {
    this.#prefix = ctx ? `${ctx}:
` : "";
  }
  #template(typeName, index, prefix = "", suffix = "") {
    const leadingStr = prefix ? `${prefix} ` : "";
    const followingStr = suffix ? ` ${suffix}` : "";
    return `${leadingStr}child "${typeName}" at index ${index}${followingStr}.`;
  }
  unexpectedChild(typeName, index) {
    return this.#template(typeName, index, "unexpected");
  }
  multipleMatches(typeName, index, ruleNames) {
    const quoted = ruleNames.map((n) => `"${n}"`);
    return this.#template(
      typeName,
      index,
      "",
      `matches multiple child rules: ${quoted.join(" and ")}`
    );
  }
  #format(errors) {
    return this.#prefix + errors.join("\n");
  }
  toError(errors) {
    if (errors.length === 0) {
      return new Error(this.#prefix + "Unknown validation error.");
    }
    return new Error(this.#format(errors));
  }
};

// ../../lib/contract/src/children/normalize-child-rule.ts
function normalizeCardinality(input, impliesSingleton) {
  const min = input?.min ?? 0;
  const max = input?.max ?? (impliesSingleton ? 1 : Infinity);
  if (min === 0 && max === Infinity) {
    return { kind: "unbounded" };
  }
  if (min > max) {
    throw new RangeError(`normalizeChildRule: min (${min}) cannot exceed max (${max})`);
  }
  return {
    kind: "bounded",
    min,
    max
  };
}
function normalizeChildRule(rule) {
  const position = rule.position ?? "any";
  const impliesSingleton = position === "first" || position === "last";
  return {
    ...rule,
    position,
    cardinality: normalizeCardinality(rule.cardinality, impliesSingleton)
  };
}

// ../../lib/contract/src/children/rules-matcher.ts
function getChildType(child) {
  if (!isObject(child) || !("type" in child)) return void 0;
  return child.type;
}
function buildPartialIndex(rules) {
  const typeIndex = /* @__PURE__ */ new Map();
  const duplicateTypes = /* @__PURE__ */ new Set();
  const untypedIndices = [];
  for (let ri = 0; ri < rules.length; ri++) {
    const t = rules[ri].type;
    if (t === void 0) {
      untypedIndices.push(ri);
    } else if (typeIndex.has(t)) {
      duplicateTypes.add(t);
    } else {
      typeIndex.set(t, ri);
    }
  }
  if (duplicateTypes.size > 0) {
    for (const t of duplicateTypes) typeIndex.delete(t);
    for (let ri = 0; ri < rules.length; ri++) {
      if (duplicateTypes.has(rules[ri].type)) untypedIndices.push(ri);
    }
  }
  return { typeIndex, untypedIndices };
}
var RuleMatcher = class {
  #rules;
  #typeIndex;
  #untypedIndices;
  constructor(rules) {
    this.#rules = rules;
    const { typeIndex, untypedIndices } = buildPartialIndex(rules);
    this.#typeIndex = typeIndex;
    this.#untypedIndices = untypedIndices;
  }
  match(children) {
    const forward = /* @__PURE__ */ new Map();
    const reverse = /* @__PURE__ */ new Map();
    const unexpectedIndices = /* @__PURE__ */ new Set();
    const ambiguousIndices = /* @__PURE__ */ new Set();
    for (let ri = 0; ri < this.#rules.length; ri++) {
      reverse.set(ri, /* @__PURE__ */ new Set());
    }
    for (const [ci, child] of children.entries()) {
      const t = getChildType(child);
      if (t !== void 0) {
        const ri = this.#typeIndex.get(t);
        if (ri !== void 0) {
          let childEntry = forward.get(ci);
          if (!childEntry) {
            childEntry = /* @__PURE__ */ new Set();
            forward.set(ci, childEntry);
          }
          childEntry.add(ri);
          reverse.get(ri).add(ci);
        }
      }
      for (const ri of this.#untypedIndices) {
        if (!this.#rules[ri].match(child)) continue;
        let childEntry = forward.get(ci);
        if (!childEntry) {
          childEntry = /* @__PURE__ */ new Set();
          forward.set(ci, childEntry);
        }
        childEntry.add(ri);
        reverse.get(ri).add(ci);
      }
      const entry = forward.get(ci);
      if (!entry) {
        unexpectedIndices.add(ci);
      } else if (entry.size > 1) {
        ambiguousIndices.add(ci);
      }
    }
    return { matrix: { childToRules: { forward, reverse } }, unexpectedIndices, ambiguousIndices };
  }
};

// ../../lib/contract/src/children/rule-validator.ts
var RuleValidator = class _RuleValidator extends StrictBase {
  #context;
  constructor(context, strict) {
    super(strict);
    this.#context = context;
  }
  validate(rules, matrix, childCount) {
    const firstIndex = 0;
    const lastIndex = childCount - 1;
    for (const [ri, rule] of rules.entries()) {
      const matches = matrix.childToRules.reverse.get(ri);
      const matchCount = matches.size;
      this.#validateCardinality(rule, matchCount);
      if (matchCount === 0) continue;
      this.#validatePositions(rule, matches, firstIndex, lastIndex);
    }
  }
  #validateCardinality(rule, matchCount) {
    const { cardinality, name } = rule;
    if (cardinality.kind !== "bounded") {
      return;
    }
    const { min, max } = cardinality;
    if (matchCount < min) {
      this.violate(`${this.#context}: "${name}" requires at least ${min}.`);
      return;
    }
    if (matchCount > max) {
      this.violate(`${this.#context}: "${name}" allows at most ${max}.`);
    }
  }
  #validatePositions(rule, matches, firstIndex, lastIndex) {
    const { name, position } = rule;
    for (const index of matches) {
      if (_RuleValidator.#isValidPosition(index, position, firstIndex, lastIndex)) {
        continue;
      }
      this.violate(`${this.#context}: "${name}" must be ${position}, got index ${index}`);
    }
  }
  static #isValidPosition(matchIndex, position, firstIndex, lastIndex) {
    switch (position) {
      case "first":
        return matchIndex === firstIndex;
      case "last":
        return matchIndex === lastIndex;
      case "any":
        return true;
      default:
        return assertNever(position);
    }
  }
};

// ../../lib/contract/src/children/children-evaluator.ts
var ChildrenEvaluator = class extends StrictBase {
  #rules;
  #ruleNames;
  #matcher;
  #ruleValidator;
  #matchBuilder;
  constructor(rules, strict = "warn", context = "Component") {
    super(strict);
    this.#rules = rules.map((r) => normalizeChildRule(r));
    this.#ruleNames = this.#rules.map((r) => r.name);
    for (const rule of this.#rules) {
      const { name, position, cardinality } = rule;
      if ((position === "first" || position === "last") && (cardinality.kind === "unbounded" || cardinality.max > 1)) {
        throw new RangeError(
          `ChildrenEvaluator [${context}]: rule "${name}" sets position="${position}" with an unbound or >1 max. position="first|last" implies max=1.`
        );
      }
    }
    this.#matcher = new RuleMatcher(this.#rules);
    this.#ruleValidator = new RuleValidator(context, strict);
    this.#matchBuilder = new MatchValidationErrorBuilder(context);
  }
  evaluate(children) {
    if (!this.strict) return;
    const { matrix, unexpectedIndices, ambiguousIndices } = this.#matcher.match(children);
    this.#ruleValidator.validate(this.#rules, matrix, children.length);
    if (unexpectedIndices.size === 0 && ambiguousIndices.size === 0) return;
    const errors = [];
    const violating = [...unexpectedIndices, ...ambiguousIndices].sort((a, b) => a - b);
    for (const ci of violating) {
      const typeName = getTypeName(children[ci]);
      if (unexpectedIndices.has(ci)) {
        errors.push(this.#matchBuilder.unexpectedChild(typeName, ci));
      } else {
        const matches = matrix.childToRules.forward.get(ci);
        const names = [...matches].map((ri) => this.#ruleNames[ri] ?? `#${ri}`);
        errors.push(this.#matchBuilder.multipleMatches(typeName, ci, names));
      }
    }
    this.invariant(errors.length === 0, this.#matchBuilder.toError(errors).message);
  }
};

// ../../lib/contract/src/children/diagnose-children.ts
function diagnoseChildren(rules, children, context = "Component") {
  if (rules.length === 0) return [];
  const normalized = rules.map(normalizeChildRule);
  const { matrix, unexpectedIndices, ambiguousIndices } = new RuleMatcher(normalized).match(
    children
  );
  const violations = [];
  const firstIndex = 0;
  const lastIndex = children.length - 1;
  for (const [ri, rule] of normalized.entries()) {
    const matches = matrix.childToRules.reverse.get(ri);
    const matchCount = matches?.size ?? 0;
    const { name, cardinality, position } = rule;
    if (cardinality.kind === "bounded") {
      const { min, max } = cardinality;
      if (matchCount < min) {
        violations.push({
          kind: "cardinality-min",
          message: `${context}: "${name}" requires at least ${min}.`,
          ruleName: name
        });
      } else if (matchCount > max) {
        violations.push({
          kind: "cardinality-max",
          message: `${context}: "${name}" allows at most ${max}.`,
          ruleName: name
        });
      }
    }
    if (matches && position !== "any") {
      for (const index of matches) {
        const valid = position === "first" ? index === firstIndex : index === lastIndex;
        if (!valid) {
          violations.push({
            kind: "position",
            message: `${context}: "${name}" must be ${position}, got index ${index}`,
            ruleName: name,
            childIndex: index
          });
        }
      }
    }
  }
  for (const ci of unexpectedIndices) {
    violations.push({
      kind: "unexpected",
      message: `unexpected child "${getTypeName(children[ci])}" at index ${ci}.`,
      childIndex: ci
    });
  }
  for (const ci of ambiguousIndices) {
    const matches = matrix.childToRules.forward.get(ci);
    const names = [...matches].map((ri) => `"${normalized[ri]?.name ?? `#${ri}`}"`);
    violations.push({
      kind: "ambiguous",
      message: `child "${getTypeName(children[ci])}" at index ${ci} matches multiple child rules: ${names.join(" and ")}.`,
      childIndex: ci
    });
  }
  return violations;
}

// src/resolver/resolver.ts
function createResolverPipeline(resolved, classPipeline) {
  const engine = new AriaPolicyEngine(resolved.strict);
  return function resolve(input) {
    const tag = resolveTag(resolved.defaultTag, input.as);
    const merged = mergeProps(resolved.defaultProps, input.props);
    const { props } = engine.validate(tag, merged);
    const className = classPipeline(tag, props, input.className, input.variantKey);
    return {
      tag,
      props,
      className,
      ...input.children !== void 0 && { children: input.children }
    };
  };
}

export {
  listContract,
  tableContract,
  tableBodyContract,
  tableRowContract,
  colgroupContract,
  dlContract,
  selectContract,
  optgroupContract,
  pictureContract,
  figureContract,
  detailsContract,
  fieldsetContract,
  htmlContracts,
  getImplicitRole,
  StrictBase,
  AriaPolicyEngine,
  ChildrenEvaluator,
  diagnoseChildren,
  createResolverPipeline
};
