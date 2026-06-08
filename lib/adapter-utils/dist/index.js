// src/apply-filter.ts
function applyFilter(props, filterProps, variantKeys) {
  const out = {};
  for (const k in props) {
    if (!Object.hasOwn(props, k)) continue;
    if (filterProps(k, variantKeys)) continue;
    out[k] = props[k];
  }
  return out;
}

// src/build-core-runtime.ts
import { createPolymorphic } from "@praxis-ui/core";
var EMPTY_SET = /* @__PURE__ */ new Set();
function buildCoreRuntime(normalized) {
  const runtime = createPolymorphic(normalized);
  const ownedKeys = "classPlugin" in runtime ? runtime.classPlugin.ownedKeys ?? EMPTY_SET : EMPTY_SET;
  return { runtime, ownedKeys };
}

// src/build-engines.ts
import { ChildrenEvaluator } from "@praxis-ui/core";
function buildEngines(strict, childRules, context) {
  return childRules?.length ? { childrenEvaluator: new ChildrenEvaluator(childRules, strict, context) } : {};
}

// src/compose-filter.ts
function composeFilter(ownedKeys, filterProps) {
  const defaultFilter = (key, variantKeys) => variantKeys.has(key) || ownedKeys.has(key);
  if (!filterProps) {
    return defaultFilter;
  }
  return (key, variantKeys) => defaultFilter(key, variantKeys) || filterProps(key, variantKeys);
}

// src/resolve-adapter-common-options.ts
function resolveAdapterCommonOptions(options, defaultName = "PolymorphicComponent", defaultStrict = "throw") {
  return {
    name: options.name ?? defaultName,
    strict: options.enforcement?.strict ?? defaultStrict
  };
}

// src/slot-validator.ts
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
export {
  SlotValidator,
  applyFilter,
  buildCoreRuntime,
  buildEngines,
  composeFilter,
  resolveAdapterCommonOptions
};
