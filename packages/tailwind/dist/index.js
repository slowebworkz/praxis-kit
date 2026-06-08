// src/create-tailwind-pipeline.ts
import { cn, createClassPipeline } from "@praxis-ui/core";

// src/class-builder.ts
import { assertNever } from "@praxis-ui/core";
var ClassBuilder = class {
  build(tokens) {
    const layout = [];
    const normal = [];
    for (const token of tokens) {
      switch (token.kind) {
        case "layout": {
          layout.push(token.raw);
          break;
        }
        case "utility":
        case "gap":
        case "conditional": {
          normal.push(token.raw);
          break;
        }
        default:
          return assertNever(token);
      }
    }
    return [...this.#dedupe(layout).toSorted(), ...this.#dedupe(normal)].join(" ");
  }
  #dedupe(arr) {
    return [...new Set(arr)];
  }
};

// src/class-classifier.ts
var LAYOUTS = {
  flex: "flex",
  "inline-flex": "flex",
  grid: "grid",
  "inline-grid": "grid"
};
var CONDITIONALS = {
  "[&.flex": "flex",
  "[&.grid": "grid"
};
var ClassClassifier = class _ClassClassifier {
  static #getBaseUtility(token) {
    let depth = 0;
    for (let i = token.length - 1; i >= 0; i--) {
      const char = token[i];
      if (char === "]") depth++;
      else if (char === "[") depth--;
      else if (char === ":" && depth === 0 && token[i - 1] !== "\\") {
        return token.slice(i + 1);
      }
    }
    return token;
  }
  classify(token) {
    const base = _ClassClassifier.#getBaseUtility(token);
    const layout = LAYOUTS[base];
    if (layout) {
      return {
        kind: "layout",
        value: layout,
        raw: token
      };
    }
    for (const prefix in CONDITIONALS) {
      if (token.startsWith(prefix)) {
        return {
          kind: "conditional",
          requires: CONDITIONALS[prefix],
          raw: token
        };
      }
    }
    return base.startsWith("gap") ? {
      kind: "gap",
      raw: token
    } : {
      kind: "utility",
      base,
      raw: token
    };
  }
};

// src/dependency-rules.ts
var defaultDependencyRules = {
  flex: [/^flex-/, /^grow/, /^shrink/, /^basis-/],
  grid: [/^grid-/, /^col-/, /^row-/, /^auto-cols-/, /^auto-rows-/]
};

// src/dependency-evaluator.ts
import { assertNever as assertNever2 } from "@praxis-ui/core";
var DependencyEvaluator = class {
  constructor(rules) {
    this.rules = rules;
  }
  rules;
  evaluate(token, state) {
    switch (token.kind) {
      case "layout": {
        return token.value === state.mode;
      }
      case "conditional": {
        return token.requires === state.mode;
      }
      case "utility": {
        for (const layout of Object.keys(this.rules)) {
          if (this.rules[layout].some((r) => r.test(token.base))) {
            return state.mode === layout;
          }
        }
        return true;
      }
      case "gap": {
        return state.mode !== "none";
      }
      default:
        return assertNever2(token);
    }
  }
};

// src/layout-state.ts
var LayoutState = class {
  #mode;
  constructor(mode) {
    this.#mode = mode;
    Object.freeze(this);
  }
  get mode() {
    return this.#mode;
  }
};

// src/layout-keys.ts
var layoutKeys = ["flex", "grid"];
var LAYOUT_OWNED_KEYS = new Set(layoutKeys);

// src/create-tailwind-pipeline.ts
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
function pipelineWarn(strict, message) {
  if (!strict) return;
  if (strict === "async-warn") {
    if (pendingAsyncWarns.has(message)) return;
    pendingAsyncWarns.add(message);
    if (!asyncWarnScheduled) {
      asyncWarnScheduled = true;
      queueMicrotask(flushAsyncWarns);
    }
    return;
  }
  console.warn(message);
}
var classifier = new ClassClassifier();
var evaluator = new DependencyEvaluator(defaultDependencyRules);
var builder = new ClassBuilder();
function normalizeVariantValue(value) {
  if (typeof value === "string") return value;
  return value.join(" ");
}
function resolveLayout(props) {
  if (process.env.NODE_ENV !== "production" && props.flex && props.grid) {
    console.warn(
      '[createTailwindPipeline] Cannot use both "flex" and "grid" simultaneously; "flex" takes precedence.'
    );
  }
  return props.flex ? "flex" : props.grid ? "grid" : "none";
}
function warnReservedLayoutLiterals(strict, tokens) {
  if (!strict) return;
  const reserved = [];
  for (const token of tokens) {
    if (token.kind === "layout") reserved.push(token.raw);
  }
  if (reserved.length === 0) return;
  pipelineWarn(
    strict,
    `[createTailwindPipeline] Reserved layout class(es) ${reserved.map((r) => `"${r}"`).join(", ")} found in resolved classes. The display mode is controlled by the "flex"/"grid" props, not by class strings.`
  );
}
var EMPTY_SET = /* @__PURE__ */ new Set();
function getVariantConfig(options) {
  return options.variants;
}
function getCompoundVariants(options) {
  return options.compoundVariants ?? [];
}
function classifyTokens(className) {
  return className.split(/\s+/).filter(Boolean).map(classifier.classify);
}
function compoundDimensions(compounds) {
  if (compounds.length === 0) return EMPTY_SET;
  const dims = /* @__PURE__ */ new Set();
  for (const compound of compounds) {
    for (const key in compound) {
      if (key !== "class") dims.add(key);
    }
  }
  return dims;
}
function getDefaultVariants(options) {
  return options.defaultVariants;
}
function resolveActiveSelection(options, variants, props, variantKey) {
  const preset = variantKey ? options.presetMap?.[variantKey] : void 0;
  const defaults = getDefaultVariants(options);
  const selection = {};
  for (const dim in variants) {
    const value = props[dim] ?? preset?.[dim] ?? defaults?.[dim];
    if (value !== void 0 && value !== null) selection[dim] = String(value);
  }
  return selection;
}
function warnDeadVariants(strict, options, compoundDims, props, variantKey, state) {
  if (!strict) return;
  const variants = getVariantConfig(options);
  if (!variants) return;
  const selection = resolveActiveSelection(options, variants, props, variantKey);
  for (const dim in selection) {
    if (compoundDims.has(dim)) continue;
    const value = selection[dim];
    const raw = variants[dim]?.[value];
    if (raw == null) continue;
    const classStr = normalizeVariantValue(raw);
    const tokens = classifyTokens(classStr);
    if (tokens.length === 0) continue;
    if (tokens.every((t) => !evaluator.evaluate(t, state))) {
      pipelineWarn(
        strict,
        `[createTailwindPipeline] Variant "${dim}=${value}" contributes only classes stripped under layout mode "${state.mode}" ("${classStr}") \u2014 it produces nothing in this mode.`
      );
    }
  }
}
function createTailwindPipeline(options, strict) {
  const pipeline = createClassPipeline(options);
  const compoundDims = compoundDimensions(getCompoundVariants(options));
  return {
    ownedKeys: LAYOUT_OWNED_KEYS,
    pipeline(tag, props, className, variantKey) {
      const mode = resolveLayout(props);
      const raw = pipeline(tag, props, className, variantKey);
      const tokens = classifyTokens(raw);
      const state = new LayoutState(mode);
      if (process.env.NODE_ENV !== "production") {
        warnReservedLayoutLiterals(strict, tokens);
        warnDeadVariants(strict, options, compoundDims, props, variantKey, state);
      }
      const filtered = tokens.filter((token) => evaluator.evaluate(token, state));
      const built = builder.build(filtered);
      if (mode === "none") return built;
      return filtered.some((t) => t.kind === "layout") ? built : cn(mode, built);
    }
  };
}
export {
  ClassBuilder,
  ClassClassifier,
  DependencyEvaluator,
  LayoutState,
  createTailwindPipeline,
  defaultDependencyRules
};
