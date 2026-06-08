// src/rules/no-dead-compound.ts
import { RuleCreator } from "@typescript-eslint/utils/eslint-utils";

// src/utils/ast.ts
function getObjectProperty(obj, key) {
  return obj.properties.find((prop) => {
    if (prop.type !== "Property" || prop.kind !== "init" || prop.computed) {
      return false;
    }
    const { key: propKey } = prop;
    return propKey.type === "Identifier" && propKey.name === key || propKey.type === "Literal" && propKey.value === key;
  });
}
function asObjectExpression(node) {
  return node?.type === "ObjectExpression" ? node : void 0;
}
function asArrayExpression(node) {
  return node?.type === "ArrayExpression" ? node : void 0;
}
function asNumericLiteral(node) {
  if (node?.type === "Literal") {
    const { value } = node;
    if (typeof value === "number") {
      return value;
    }
  }
  if (node?.type === "UnaryExpression") {
    const { operator, argument } = node;
    if ((operator === "-" || operator === "+") && argument.type === "Literal" && typeof argument.value === "number") {
      return operator === "-" ? -argument.value : argument.value;
    }
  }
  return void 0;
}
function isFactoryCall(node, calleeNames) {
  const { callee } = node;
  if (callee.type === "Identifier") {
    return calleeNames.has(callee.name);
  }
  if (callee.type === "MemberExpression" && !callee.computed) {
    const { property } = callee;
    return property.type === "Identifier" && calleeNames.has(property.name);
  }
  return false;
}
function getFirstObjectArg(node) {
  const [first] = node.arguments;
  return first?.type === "ObjectExpression" ? first : void 0;
}
function asStringLiteral(node) {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;
  return void 0;
}
function getPropertyKey(prop) {
  const { key } = prop;
  if (prop.computed) return void 0;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return void 0;
}
function extractVariantMap(variantsNode) {
  const variantsObj = asObjectExpression(variantsNode);
  if (!variantsObj) return void 0;
  const map = /* @__PURE__ */ new Map();
  for (const prop of variantsObj.properties) {
    if (prop.type !== "Property") continue;
    const key = getPropertyKey(prop);
    if (!key) continue;
    const valuesObj = asObjectExpression(prop.value);
    if (!valuesObj) continue;
    const values = /* @__PURE__ */ new Set();
    for (const vProp of valuesObj.properties) {
      if (vProp.type !== "Property") continue;
      const vKey = getPropertyKey(vProp);
      if (vKey !== void 0) values.add(vKey);
    }
    map.set(key, values);
  }
  return map;
}

// src/rules/no-dead-compound.ts
var createRule = RuleCreator((name) => `https://praxis-ui.dev/eslint-rules/${name}`);
var noDeadCompound = createRule({
  name: "no-dead-compound",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow compound variant conditions that reference unknown variant keys or values \u2014 compounds that can never fire."
    },
    messages: {
      unknownVariantKey: '"{{ key }}" is not a variant defined in styling.variants. This compound condition can never match.',
      unknownVariantValue: '"{{ value }}" is not a valid value for variant "{{ key }}". Expected one of: {{ allowed }}. This compound condition can never match.',
      nonLiteralValue: 'Compound value for "{{ key }}" is not a string literal and cannot be statically validated.'
    },
    schema: [
      {
        type: "object",
        properties: {
          calleeNames: { type: "array", items: { type: "string" } },
          reportNonLiteral: { type: "boolean" }
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [{}],
  create(context) {
    const calleeNames = new Set(context.options[0]?.calleeNames ?? ["createContractComponent"]);
    const reportNonLiteral = context.options[0]?.reportNonLiteral ?? false;
    return {
      CallExpression(node) {
        if (!isFactoryCall(node, calleeNames)) return;
        const arg = getFirstObjectArg(node);
        if (!arg) return;
        const stylingProp = getObjectProperty(arg, "styling");
        if (!stylingProp) return;
        const styling = asObjectExpression(stylingProp.value);
        if (!styling) return;
        const variantsProp = getObjectProperty(styling, "variants");
        if (!variantsProp) return;
        const variantMap = extractVariantMap(variantsProp.value);
        if (!variantMap || variantMap.size === 0) return;
        const compoundsProp = getObjectProperty(styling, "compounds");
        if (!compoundsProp) return;
        const compounds = asArrayExpression(compoundsProp.value);
        if (!compounds) return;
        for (const element of compounds.elements) {
          if (!element || element.type !== "ObjectExpression") continue;
          for (const prop of element.properties) {
            if (prop.type !== "Property") continue;
            const key = getPropertyKey(prop);
            if (!key || key === "class" || key === "className") continue;
            if (!variantMap.has(key)) {
              context.report({
                node: prop,
                messageId: "unknownVariantKey",
                data: { key }
              });
              continue;
            }
            const value = asStringLiteral(prop.value);
            if (value === void 0) {
              if (reportNonLiteral) {
                context.report({ node: prop, messageId: "nonLiteralValue", data: { key } });
              }
              continue;
            }
            const allowed = variantMap.get(key);
            if (!allowed.has(value)) {
              context.report({
                node: prop,
                messageId: "unknownVariantValue",
                data: { key, value, allowed: [...allowed].map((v) => `"${v}"`).join(", ") }
              });
            }
          }
        }
      }
    };
  }
});

// src/rules/no-enforcement-without-strict.ts
import { RuleCreator as RuleCreator2 } from "@typescript-eslint/utils/eslint-utils";
var createRule2 = RuleCreator2((name) => `https://praxis-ui.dev/eslint-rules/${name}`);
var noEnforcementWithoutStrict = createRule2({
  name: "no-enforcement-without-strict",
  meta: {
    type: "problem",
    docs: {
      description: "Require enforcement.strict when enforcement.children or enforcement.aria is defined."
    },
    messages: {
      missingStrict: "enforcement.{{ field }} is defined but enforcement.strict is not explicitly set. Adapter defaults vary \u2014 declare strict explicitly so the behavior is clear at the call site."
    },
    schema: [
      {
        type: "object",
        properties: {
          calleeNames: { type: "array", items: { type: "string" } }
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [{}],
  create(context) {
    const calleeNames = new Set(context.options[0]?.calleeNames ?? ["createContractComponent"]);
    return {
      CallExpression(node) {
        if (!isFactoryCall(node, calleeNames)) return;
        const arg = getFirstObjectArg(node);
        if (!arg) return;
        const enfProp = getObjectProperty(arg, "enforcement");
        if (!enfProp) return;
        const enf = asObjectExpression(enfProp.value);
        if (!enf) return;
        const hasStrict = getObjectProperty(enf, "strict") !== void 0;
        for (const field of ["children", "aria"]) {
          const fieldProp = getObjectProperty(enf, field);
          if (!fieldProp) continue;
          if (field === "children") {
            const arr = asArrayExpression(fieldProp.value);
            if (!arr || arr.elements.length === 0) continue;
          }
          if (!hasStrict) {
            context.report({ node, messageId: "missingStrict", data: { field } });
            return;
          }
        }
      }
    };
  }
});

// src/rules/no-invalid-default.ts
import { RuleCreator as RuleCreator3 } from "@typescript-eslint/utils/eslint-utils";
var createRule3 = RuleCreator3((name) => `https://praxis-ui.dev/eslint-rules/${name}`);
var noInvalidDefault = createRule3({
  name: "no-invalid-default",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow styling.defaults entries whose keys or values do not exist in styling.variants."
    },
    messages: {
      unknownDefaultKey: '"{{ key }}" is not a variant defined in styling.variants. This default will have no effect.',
      unknownDefaultValue: '"{{ value }}" is not a valid value for variant "{{ key }}". Expected one of: {{ allowed }}. This default will have no effect.',
      nonLiteralValue: 'Default value for "{{ key }}" is not a string literal and cannot be statically validated.'
    },
    schema: [
      {
        type: "object",
        properties: {
          calleeNames: { type: "array", items: { type: "string" } },
          reportNonLiteral: { type: "boolean" }
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [{}],
  create(context) {
    const calleeNames = new Set(context.options[0]?.calleeNames ?? ["createContractComponent"]);
    const reportNonLiteral = context.options[0]?.reportNonLiteral ?? false;
    return {
      CallExpression(node) {
        if (!isFactoryCall(node, calleeNames)) return;
        const arg = getFirstObjectArg(node);
        if (!arg) return;
        const stylingProp = getObjectProperty(arg, "styling");
        if (!stylingProp) return;
        const styling = asObjectExpression(stylingProp.value);
        if (!styling) return;
        const variantsProp = getObjectProperty(styling, "variants");
        if (!variantsProp) return;
        const variantMap = extractVariantMap(variantsProp.value);
        if (!variantMap || variantMap.size === 0) return;
        const defaultsProp = getObjectProperty(styling, "defaults");
        if (!defaultsProp) return;
        const defaults = asObjectExpression(defaultsProp.value);
        if (!defaults) return;
        for (const prop of defaults.properties) {
          if (prop.type !== "Property") continue;
          const key = getPropertyKey(prop);
          if (!key) continue;
          if (!variantMap.has(key)) {
            context.report({ node: prop, messageId: "unknownDefaultKey", data: { key } });
            continue;
          }
          const value = asStringLiteral(prop.value);
          if (value === void 0) {
            if (reportNonLiteral) {
              context.report({ node: prop, messageId: "nonLiteralValue", data: { key } });
            }
            continue;
          }
          const allowed = variantMap.get(key);
          if (!allowed.has(value)) {
            context.report({
              node: prop,
              messageId: "unknownDefaultValue",
              data: { key, value, allowed: [...allowed].map((v) => `"${v}"`).join(", ") }
            });
          }
        }
      }
    };
  }
});

// src/rules/no-invalid-html-nesting.ts
import { RuleCreator as RuleCreator4 } from "@typescript-eslint/utils/eslint-utils";

// src/utils/html-nesting.ts
var HTML_ALLOWED_CHILDREN = {
  ul: /* @__PURE__ */ new Set(["li", "script", "template"]),
  ol: /* @__PURE__ */ new Set(["li", "script", "template"]),
  table: /* @__PURE__ */ new Set(["caption", "colgroup", "thead", "tbody", "tfoot", "tr", "script", "template"]),
  thead: /* @__PURE__ */ new Set(["tr", "script", "template"]),
  tbody: /* @__PURE__ */ new Set(["tr", "script", "template"]),
  tfoot: /* @__PURE__ */ new Set(["tr", "script", "template"]),
  tr: /* @__PURE__ */ new Set(["td", "th", "script", "template"]),
  colgroup: /* @__PURE__ */ new Set(["col", "template"]),
  dl: /* @__PURE__ */ new Set(["dt", "dd", "div", "script", "template"]),
  select: /* @__PURE__ */ new Set(["option", "optgroup", "hr", "script", "template"]),
  optgroup: /* @__PURE__ */ new Set(["option", "script", "template"]),
  picture: /* @__PURE__ */ new Set(["source", "img", "script", "template"])
};

// src/rules/no-invalid-html-nesting.ts
var createRule4 = RuleCreator4((name) => `https://praxis-ui.dev/eslint-rules/${name}`);
function getIntrinsicTag(name) {
  if (name.type !== "JSXIdentifier") return void 0;
  const text = name.name;
  return text.length > 0 && text[0] === text[0].toLowerCase() && text[0] !== text[0].toUpperCase() ? text : void 0;
}
var noInvalidHtmlNesting = createRule4({
  name: "no-invalid-html-nesting",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow HTML children that violate the HTML5 content model for their parent element."
    },
    messages: {
      invalidChild: "<{{ child }}> is not a valid direct child of <{{ parent }}>. Allowed children: {{ allowed }}."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXElement(node) {
        const parentTag = getIntrinsicTag(node.openingElement.name);
        if (!parentTag) return;
        const allowed = HTML_ALLOWED_CHILDREN[parentTag];
        if (!allowed) return;
        for (const child of node.children) {
          if (child.type !== "JSXElement") continue;
          const childTag = getIntrinsicTag(child.openingElement.name);
          if (childTag === void 0) continue;
          if (allowed.has(childTag)) continue;
          context.report({
            node: child,
            messageId: "invalidChild",
            data: {
              child: childTag,
              parent: parentTag,
              allowed: [...allowed].join(", ")
            }
          });
        }
      }
    };
  }
});

// src/rules/no-redundant-role.ts
import { RuleCreator as RuleCreator5 } from "@typescript-eslint/utils/eslint-utils";

// src/utils/implicit-roles.ts
var IMPLICIT_ROLES = {
  article: "article",
  aside: "complementary",
  button: "button",
  datalist: "listbox",
  details: "group",
  dialog: "dialog",
  figure: "figure",
  form: "form",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  hr: "separator",
  img: "img",
  li: "listitem",
  main: "main",
  math: "math",
  menu: "list",
  meter: "meter",
  nav: "navigation",
  ol: "list",
  option: "option",
  output: "status",
  progress: "progressbar",
  search: "search",
  section: "region",
  select: "listbox",
  summary: "button",
  table: "table",
  tbody: "rowgroup",
  td: "cell",
  textarea: "textbox",
  tfoot: "rowgroup",
  th: "columnheader",
  thead: "rowgroup",
  tr: "row",
  ul: "list"
};

// src/rules/no-redundant-role.ts
var createRule5 = RuleCreator5((name) => `https://praxis-ui.dev/eslint-rules/${name}`);
function getJsxTagName(node) {
  const name = node.name;
  if (name.type === "JSXIdentifier") return name.name;
  return void 0;
}
function getJsxStringAttribute(node, attrName) {
  for (const attr of node.attributes) {
    if (attr.type !== "JSXAttribute") continue;
    const key = attr.name;
    if (key.type !== "JSXIdentifier" || key.name !== attrName) continue;
    const val = attr.value;
    if (val === null) continue;
    if (val.type === "Literal" && typeof val.value === "string") {
      return { node: attr, value: val.value };
    }
    if (val.type === "JSXExpressionContainer" && val.expression.type === "Literal" && typeof val.expression.value === "string") {
      return { node: attr, value: val.expression.value };
    }
  }
  return void 0;
}
var noRedundantRole = createRule5({
  name: "no-redundant-role",
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow role attributes that duplicate the implicit ARIA role of the HTML element."
    },
    fixable: "code",
    messages: {
      redundantRole: 'role="{{ role }}" is redundant on <{{ tag }}>: the element already carries this implicit ARIA role. Remove the attribute.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node) {
        const tag = getJsxTagName(node);
        if (!tag) return;
        const implicitRole = IMPLICIT_ROLES[tag];
        if (!implicitRole) return;
        const roleAttr = getJsxStringAttribute(node, "role");
        if (!roleAttr) return;
        if (roleAttr.value === implicitRole) {
          context.report({
            node: roleAttr.node,
            messageId: "redundantRole",
            data: { role: roleAttr.value, tag },
            fix(fixer) {
              return fixer.remove(roleAttr.node);
            }
          });
        }
      }
    };
  }
});

// src/rules/valid-cardinality.ts
import { RuleCreator as RuleCreator6 } from "@typescript-eslint/utils/eslint-utils";
var createRule6 = RuleCreator6((name) => `https://praxis-ui.dev/eslint-rules/${name}`);
var validCardinality = createRule6({
  name: "valid-cardinality",
  meta: {
    type: "problem",
    docs: {
      description: "Enforce valid min/max values in enforcement.children cardinality rules."
    },
    messages: {
      negativeMin: "cardinality.min must be >= 0 (got {{ value }}).",
      negativeMax: "cardinality.max must be >= 0 (got {{ value }}).",
      maxLessThanMin: "cardinality.max ({{ max }}) must be >= cardinality.min ({{ min }}). This rule can never be satisfied.",
      zeroMax: "cardinality.max of 0 means no children of this type are allowed. Use 0 intentionally or remove the rule."
    },
    schema: [
      {
        type: "object",
        properties: {
          calleeNames: { type: "array", items: { type: "string" } }
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [{}],
  create(context) {
    const calleeNames = new Set(context.options[0]?.calleeNames ?? ["createContractComponent"]);
    return {
      CallExpression(node) {
        if (!isFactoryCall(node, calleeNames)) return;
        const arg = getFirstObjectArg(node);
        if (!arg) return;
        const enfProp = getObjectProperty(arg, "enforcement");
        if (!enfProp) return;
        const enf = asObjectExpression(enfProp.value);
        if (!enf) return;
        const childrenProp = getObjectProperty(enf, "children");
        if (!childrenProp) return;
        const arr = asArrayExpression(childrenProp.value);
        if (!arr) return;
        for (const element of arr.elements) {
          if (!element || element.type !== "ObjectExpression") continue;
          const cardProp = getObjectProperty(element, "cardinality");
          if (!cardProp) continue;
          const card = asObjectExpression(cardProp.value);
          if (!card) continue;
          const minProp = getObjectProperty(card, "min");
          const maxProp = getObjectProperty(card, "max");
          const min = minProp ? asNumericLiteral(minProp.value) : void 0;
          const max = maxProp ? asNumericLiteral(maxProp.value) : void 0;
          if (min !== void 0 && min < 0) {
            context.report({
              node: minProp,
              messageId: "negativeMin",
              data: { value: String(min) }
            });
          }
          if (max !== void 0 && max < 0) {
            context.report({
              node: maxProp,
              messageId: "negativeMax",
              data: { value: String(max) }
            });
          }
          if (max !== void 0 && max === 0) {
            context.report({ node: maxProp, messageId: "zeroMax" });
          }
          if (min !== void 0 && max !== void 0 && min >= 0 && max > 0 && max < min) {
            context.report({
              node: cardProp,
              messageId: "maxLessThanMin",
              data: { min: String(min), max: String(max) }
            });
          }
        }
      }
    };
  }
});

// src/rules/valid-children-config.ts
import { RuleCreator as RuleCreator7 } from "@typescript-eslint/utils/eslint-utils";
var createRule7 = RuleCreator7((name) => `https://praxis-ui.dev/eslint-rules/${name}`);
var validChildrenConfig = createRule7({
  name: "valid-children-config",
  meta: {
    type: "problem",
    docs: {
      description: "Enforce cross-rule consistency of enforcement.children \u2014 detect positional conflicts and cardinality impossibilities."
    },
    messages: {
      multipleFirst: 'Multiple enforcement.children rules require position: "first". Only one child can occupy the first position.',
      multipleLast: 'Multiple enforcement.children rules require position: "last". Only one child can occupy the last position.',
      minSumExceedsCapacity: 'A rule with position: "only" requires min >= 1, but {{ count }} other rule(s) also require min >= 1. These constraints cannot be satisfied simultaneously.'
    },
    schema: [
      {
        type: "object",
        properties: {
          calleeNames: { type: "array", items: { type: "string" } }
        },
        additionalProperties: false
      }
    ]
  },
  defaultOptions: [{}],
  create(context) {
    const calleeNames = new Set(context.options[0]?.calleeNames ?? ["createContractComponent"]);
    return {
      CallExpression(node) {
        if (!isFactoryCall(node, calleeNames)) return;
        const arg = getFirstObjectArg(node);
        if (!arg) return;
        const enfProp = getObjectProperty(arg, "enforcement");
        if (!enfProp) return;
        const enf = asObjectExpression(enfProp.value);
        if (!enf) return;
        const childrenProp = getObjectProperty(enf, "children");
        if (!childrenProp) return;
        const arr = asArrayExpression(childrenProp.value);
        if (!arr) return;
        const firstPositionProps = [];
        const lastPositionProps = [];
        let onlyWithMinProp = null;
        let rulesWithMinCount = 0;
        for (const element of arr.elements) {
          if (!element || element.type !== "ObjectExpression") continue;
          const positionProp = getObjectProperty(element, "position");
          const position = positionProp ? asStringLiteral(positionProp.value) : void 0;
          const cardProp = getObjectProperty(element, "cardinality");
          const card = cardProp ? asObjectExpression(cardProp.value) : void 0;
          const minProp = card ? getObjectProperty(card, "min") : void 0;
          const min = minProp ? asNumericLiteral(minProp.value) ?? 0 : 0;
          if (position === "first" && positionProp) {
            firstPositionProps.push(positionProp);
          }
          if (position === "last" && positionProp) {
            lastPositionProps.push(positionProp);
          }
          if (min >= 1) {
            rulesWithMinCount++;
            if (position === "only" && positionProp && !onlyWithMinProp) {
              onlyWithMinProp = positionProp;
            }
          }
        }
        for (const prop of firstPositionProps.slice(1)) {
          context.report({ node: prop, messageId: "multipleFirst" });
        }
        for (const prop of lastPositionProps.slice(1)) {
          context.report({ node: prop, messageId: "multipleLast" });
        }
        if (onlyWithMinProp && rulesWithMinCount > 1) {
          context.report({
            node: onlyWithMinProp,
            messageId: "minSumExceedsCapacity",
            data: { count: String(rulesWithMinCount - 1) }
          });
        }
      }
    };
  }
});

// src/index.ts
var plugin = {
  meta: {
    name: "@praxis-ui/eslint-plugin",
    version: "1.0.0"
  },
  rules: {
    "no-dead-compound": noDeadCompound,
    "no-enforcement-without-strict": noEnforcementWithoutStrict,
    "no-invalid-default": noInvalidDefault,
    "no-invalid-html-nesting": noInvalidHtmlNesting,
    "no-redundant-role": noRedundantRole,
    "valid-cardinality": validCardinality,
    "valid-children-config": validChildrenConfig
  },
  configs: {}
};
var recommended = {
  name: "@praxis-ui/recommended",
  plugins: { "@praxis-ui": plugin },
  rules: {
    "@praxis-ui/no-dead-compound": "error",
    "@praxis-ui/no-enforcement-without-strict": "error",
    "@praxis-ui/no-invalid-default": "error",
    "@praxis-ui/no-invalid-html-nesting": "error",
    "@praxis-ui/no-redundant-role": "warn",
    "@praxis-ui/valid-cardinality": "error",
    "@praxis-ui/valid-children-config": "error"
  }
};
plugin.configs["recommended"] = recommended;
var index_default = plugin;
export {
  index_default as default,
  noDeadCompound,
  noEnforcementWithoutStrict,
  noInvalidDefault,
  noInvalidHtmlNesting,
  noRedundantRole,
  plugin,
  recommended,
  validCardinality,
  validChildrenConfig
};
