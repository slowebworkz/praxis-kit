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
  const slotValidator = new SlotValidator(normalized.name, normalized.strict, "Snippet");
  return {
    runtime,
    filterProps,
    slotValidator,
    ...childrenEvaluator !== void 0 && { childrenEvaluator }
  };
}

// src/create-contract-component.ts
function createContractComponent(options) {
  return buildRuntime(
    options
  );
}
export {
  createContractComponent
};
