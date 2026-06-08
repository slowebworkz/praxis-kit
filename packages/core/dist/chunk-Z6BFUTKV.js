import {
  clsx
} from "./chunk-RCIN4KIG.js";

// ../../lib/styling/src/utils/cn.ts
function cn(...inputs) {
  return clsx(...inputs);
}

// ../../node_modules/.pnpm/class-variance-authority@0.7.1/node_modules/class-variance-authority/dist/index.mjs
var falsyToString = (value) => typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;
var cx = clsx;
var cva = (base, config) => (props) => {
  var _config_compoundVariants;
  if ((config === null || config === void 0 ? void 0 : config.variants) == null) return cx(base, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
  const { variants, defaultVariants } = config;
  const getVariantClassNames = Object.keys(variants).map((variant) => {
    const variantProp = props === null || props === void 0 ? void 0 : props[variant];
    const defaultVariantProp = defaultVariants === null || defaultVariants === void 0 ? void 0 : defaultVariants[variant];
    if (variantProp === null) return null;
    const variantKey = falsyToString(variantProp) || falsyToString(defaultVariantProp);
    return variants[variant][variantKey];
  });
  const propsWithoutUndefined = props && Object.entries(props).reduce((acc, param) => {
    let [key, value] = param;
    if (value === void 0) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
  const getCompoundVariantClassNames = config === null || config === void 0 ? void 0 : (_config_compoundVariants = config.compoundVariants) === null || _config_compoundVariants === void 0 ? void 0 : _config_compoundVariants.reduce((acc, param) => {
    let { class: cvClass, className: cvClassName, ...compoundVariantOptions } = param;
    return Object.entries(compoundVariantOptions).every((param2) => {
      let [key, value] = param2;
      return Array.isArray(value) ? value.includes({
        ...defaultVariants,
        ...propsWithoutUndefined
      }[key]) : {
        ...defaultVariants,
        ...propsWithoutUndefined
      }[key] === value;
    }) ? [
      ...acc,
      cvClass,
      cvClassName
    ] : acc;
  }, []);
  return cx(base, getVariantClassNames, getCompoundVariantClassNames, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
};

// ../../lib/styling/src/cva.ts
function cva2(base, config) {
  const fn = cva(base, config);
  return (props) => cn(fn(props));
}

// ../../lib/styling/src/static-class-resolver.ts
var StaticClassResolver = class {
  #baseClass;
  #cache = /* @__PURE__ */ new Map();
  #resolveTag;
  constructor(baseClass, tagMap) {
    this.#baseClass = baseClass;
    this.#resolveTag = tagMap ? (tag) => {
      const extra = tagMap[tag];
      return extra ? `${this.#baseClass} ${extra}` : this.#baseClass;
    } : () => this.#baseClass;
  }
  resolve(tag, skipTagMap = false) {
    if (typeof tag !== "string" || skipTagMap) return this.#baseClass;
    const cached = this.#cache.get(tag);
    if (cached !== void 0) {
      this.#cache.delete(tag);
      this.#cache.set(tag, cached);
      return cached;
    }
    const result = this.#resolveTag(tag);
    this.#cache.set(tag, result);
    if (this.#cache.size > 200) {
      const lru = this.#cache.keys().next().value;
      if (lru !== void 0) this.#cache.delete(lru);
    }
    return result;
  }
};

// ../../lib/styling/src/variant-class-resolver.ts
var VariantClassResolver = class _VariantClassResolver {
  #cvaFn;
  #presetMap;
  #variantKeys;
  #precomputedClasses;
  #cache = /* @__PURE__ */ new Map();
  constructor(cvaFn, presetMap, variantKeys, precomputedClasses) {
    this.#cvaFn = cvaFn ?? null;
    this.#presetMap = Object.freeze(presetMap ?? {});
    this.#variantKeys = variantKeys ?? null;
    this.#precomputedClasses = precomputedClasses ?? null;
  }
  resolve({ props, variantKey }) {
    const normalizedKey = variantKey ?? "__none__";
    const cacheKey = this.#createCacheKey(props, normalizedKey);
    if (this.#precomputedClasses !== null) {
      const precomputed = this.#precomputedClasses[cacheKey];
      if (precomputed !== void 0) return precomputed;
    }
    const cached = this.#cache.get(cacheKey);
    if (cached !== void 0) {
      this.#cache.delete(cacheKey);
      this.#cache.set(cacheKey, cached);
      return cached;
    }
    const result = this.#compute(props, variantKey);
    this.#cache.set(cacheKey, result);
    if (this.#cache.size > 1e3) {
      const lru = this.#cache.keys().next().value;
      if (lru !== void 0) this.#cache.delete(lru);
    }
    return result;
  }
  #compute(props, variantKey) {
    if (!this.#cvaFn) return "";
    if (!variantKey) return this.#cvaFn(props);
    const preset = this.#presetMap[variantKey];
    if (!preset) return this.#cvaFn(props);
    return this.#cvaFn({ ...preset, ...props });
  }
  // When variantKeys is provided, only those keys are included in the cache key — non-variant
  // props (className, id, etc.) produce identical CVA output and must not fragment the cache.
  // Iterating #variantKeys directly (fixed Set insertion order) avoids Object.keys + filter + sort.
  // String is built incrementally to avoid a parts[] array allocation on every render.
  #createCacheKey(props, variantKey) {
    if (this.#variantKeys !== null) {
      let key2 = variantKey;
      for (const k of this.#variantKeys) {
        if (k in props) key2 += `|${k}:${_VariantClassResolver.#serializeValue(props[k])}`;
      }
      return key2;
    }
    let key = variantKey;
    for (const k of Object.keys(props).sort()) {
      key += `|${k}:${_VariantClassResolver.#serializeValue(props[k])}`;
    }
    return key;
  }
  static #serializeValue(value) {
    if (value === void 0) return "u";
    if (value === null) return "n";
    if (typeof value === "boolean") return `b:${value}`;
    if (typeof value === "string") return `s:${value}`;
    return `x:${String(value)}`;
  }
};

// ../../lib/styling/src/create-class-pipeline.ts
function createClassPipeline(resolved) {
  const baseClass = resolved.baseClassName ?? "";
  const cvaFn = resolved.variants ? cva2("", {
    variants: resolved.variants,
    defaultVariants: resolved.defaultVariants,
    compoundVariants: resolved.compoundVariants
  }) : null;
  const variantKeys = resolved.variants ? new Set(Object.keys(resolved.variants)) : void 0;
  const staticResolver = new StaticClassResolver(baseClass, resolved.tagMap);
  const variantResolver = new VariantClassResolver(
    cvaFn,
    resolved.presetMap,
    variantKeys,
    resolved.precomputedClasses
  );
  return function resolveClasses(tag, props, className, variantKey) {
    const staticClasses = staticResolver.resolve(tag, variantKey !== void 0);
    const variantClasses = variantResolver.resolve({ props, variantKey });
    if (!className)
      return staticClasses && variantClasses ? `${staticClasses} ${variantClasses}` : staticClasses || variantClasses;
    return cn(staticClasses, variantClasses, className);
  };
}

// ../../lib/styling/src/diagnose-class-pipeline.ts
function conditionMatches(got, expected) {
  if (Array.isArray(expected)) return expected.includes(got);
  return got === expected;
}
function diagnoseClassPipeline(options, tag, props, className, variantKey) {
  const base = options.baseClassName ?? "";
  const tagMapBypassed = variantKey !== void 0;
  const tagMapClass = typeof tag === "string" && options.tagMap ? options.tagMap[tag] ?? null : null;
  const presetMap = options.presetMap ?? {};
  const presetValues = variantKey !== void 0 ? presetMap[variantKey] ?? null : null;
  const defaults = options.defaultVariants ?? {};
  const preset = presetValues ?? {};
  const effectiveVariants = { ...defaults, ...preset, ...props };
  const rawCompounds = options.compoundVariants ?? [];
  const compounds = rawCompounds.map((compound) => {
    const { class: cls, ...conditions } = compound;
    const typedConditions = conditions;
    const mismatches = [];
    for (const [key, expected] of Object.entries(typedConditions)) {
      const got = effectiveVariants[key];
      if (!conditionMatches(got, expected)) mismatches.push({ key, expected, got });
    }
    return {
      conditions: typedConditions,
      class: cls,
      fired: mismatches.length === 0,
      mismatches
    };
  });
  const cvaFn = options.variants ? cva2("", {
    variants: options.variants,
    defaultVariants: options.defaultVariants,
    compoundVariants: options.compoundVariants
  }) : null;
  const variantClasses = cvaFn ? cvaFn({ ...preset, ...props }) : "";
  const staticPart = tagMapBypassed ? base : cn(base, tagMapClass);
  const final = cn(staticPart, variantClasses, className);
  return {
    base,
    tagMapClass,
    tagMapBypassed,
    presetKey: variantKey,
    presetValues,
    effectiveVariants,
    compounds,
    callerClass: className,
    final
  };
}

export {
  createClassPipeline,
  diagnoseClassPipeline
};
