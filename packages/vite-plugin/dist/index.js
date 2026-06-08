// src/ast.ts
import ts from "typescript";
function getProperty(obj, key) {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = prop.name;
    if ((ts.isIdentifier(name) || ts.isStringLiteral(name)) && name.text === key)
      return prop.initializer;
  }
  return void 0;
}
function asObject(node) {
  if (!node) return void 0;
  return ts.isObjectLiteralExpression(node) ? node : void 0;
}
function asArray(node) {
  if (!node) return void 0;
  return ts.isArrayLiteralExpression(node) ? node : void 0;
}
function asPositiveInt(node) {
  if (!node) return void 0;
  if (ts.isNumericLiteral(node)) {
    const n = Number(node.text);
    return Number.isFinite(n) && n >= 0 ? n : void 0;
  }
  return void 0;
}
function isFactoryCall(call, names) {
  const { expression } = call;
  if (ts.isIdentifier(expression)) return names.has(expression.text);
  if (ts.isPropertyAccessExpression(expression)) return names.has(expression.name.text);
  return false;
}
function firstObjectArg(call) {
  const [first] = call.arguments;
  return first && ts.isObjectLiteralExpression(first) ? first : void 0;
}
function walk(node, visitor) {
  visitor(node);
  ts.forEachChild(node, (child) => walk(child, visitor));
}
function parseSource(filename, code) {
  return ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

// src/class-extract.ts
import ts2 from "typescript";
var MAX_COMBINATIONS = 512;
function asString(node) {
  return node && ts2.isStringLiteral(node) ? node.text : void 0;
}
function asStringOrStringArray(node) {
  if (!node) return void 0;
  if (ts2.isStringLiteral(node)) return node.text;
  if (ts2.isArrayLiteralExpression(node)) {
    const items = [];
    for (const elem of node.elements) {
      if (!ts2.isStringLiteral(elem)) return void 0;
      items.push(elem.text);
    }
    return items;
  }
  return void 0;
}
function propKey(prop) {
  if (!ts2.isPropertyAssignment(prop)) return void 0;
  const n = prop.name;
  return ts2.isIdentifier(n) || ts2.isStringLiteral(n) ? n.text : void 0;
}
function extractVariantMap(stylingObj) {
  const variantsObj = asObject(getProperty(stylingObj, "variants"));
  if (!variantsObj) return null;
  const result = {};
  for (const prop of variantsObj.properties) {
    const key = propKey(prop);
    if (!key || !ts2.isPropertyAssignment(prop)) return null;
    const valuesObj = asObject(prop.initializer);
    if (!valuesObj) return null;
    const values = {};
    for (const vp of valuesObj.properties) {
      const vk = propKey(vp);
      if (!vk || !ts2.isPropertyAssignment(vp)) return null;
      const v = asStringOrStringArray(vp.initializer);
      if (v === void 0) return null;
      values[vk] = v;
    }
    result[key] = values;
  }
  return result;
}
function extractDefaults(stylingObj) {
  const defaultsObj = asObject(getProperty(stylingObj, "defaults"));
  if (!defaultsObj) return {};
  const result = {};
  for (const prop of defaultsObj.properties) {
    const key = propKey(prop);
    if (!key || !ts2.isPropertyAssignment(prop)) return {};
    const v = asString(prop.initializer);
    if (v === void 0) return {};
    result[key] = v;
  }
  return result;
}
function extractCompounds(stylingObj) {
  const compoundsArr = asArray(getProperty(stylingObj, "compounds"));
  if (!compoundsArr) return [];
  const result = [];
  for (const elem of compoundsArr.elements) {
    const obj = asObject(elem);
    if (!obj) return null;
    const cls = asStringOrStringArray(getProperty(obj, "class"));
    if (cls === void 0) return null;
    const conditions = {};
    for (const cp of obj.properties) {
      const key = propKey(cp);
      if (!key || !ts2.isPropertyAssignment(cp)) return null;
      if (key === "class") continue;
      const v = asStringOrStringArray(cp.initializer);
      if (v === void 0) return null;
      conditions[key] = v;
    }
    result.push({ conditions, cls });
  }
  return result;
}
function enumerateCombinations(variantMap) {
  const keys = Object.keys(variantMap);
  if (keys.length === 0) return [{}];
  let total = 1;
  for (const key of keys) {
    total *= Object.keys(variantMap[key]).length + 1;
    if (total > MAX_COMBINATIONS) return null;
  }
  function rec(remaining) {
    if (remaining.length === 0) return [{}];
    const first = remaining[0];
    const rest = remaining.slice(1);
    const restCombos = rec(rest);
    const valueKeys = Object.keys(variantMap[first]);
    const out = [];
    for (const combo of restCombos) {
      out.push(combo);
      for (const v of valueKeys) {
        out.push({ [first]: v, ...combo });
      }
    }
    return out;
  }
  return rec(keys);
}
function buildCacheKey(props) {
  const parts = Object.keys(props).sort().map((k) => `${k}:s:${props[k]}`);
  return `__none__:${parts.join("|")}`;
}
function computeClasses(config, props) {
  const { variantMap, defaults, compounds } = config;
  const effective = { ...defaults, ...props };
  const classes = [];
  for (const [key, values] of Object.entries(variantMap)) {
    const v = effective[key];
    if (v === void 0) continue;
    const cls = values[v];
    if (cls === void 0) continue;
    if (Array.isArray(cls)) classes.push(...cls);
    else classes.push(cls);
  }
  for (const { conditions, cls } of compounds) {
    let ok = true;
    for (const [key, cond] of Object.entries(conditions)) {
      const v = effective[key];
      if (Array.isArray(cond)) {
        if (v === void 0 || !cond.includes(v)) {
          ok = false;
          break;
        }
      } else {
        if (v !== cond) {
          ok = false;
          break;
        }
      }
    }
    if (ok) {
      if (Array.isArray(cls)) classes.push(...cls);
      else classes.push(cls);
    }
  }
  return classes.filter(Boolean).join(" ");
}
function buildPrecomputedClasses(stylingObj) {
  if (getProperty(stylingObj, "precomputedClasses") !== void 0) return null;
  const variantMap = extractVariantMap(stylingObj);
  if (!variantMap || Object.keys(variantMap).length === 0) return null;
  const defaults = extractDefaults(stylingObj);
  const compounds = extractCompounds(stylingObj);
  if (!compounds) return null;
  const combos = enumerateCombinations(variantMap);
  if (!combos) return null;
  const config = { variantMap, defaults, compounds };
  const map = {};
  for (const combo of combos) {
    map[buildCacheKey(combo)] = computeClasses(config, combo);
  }
  return map;
}
function createClassExtractTransformer(factory, calleeNames, onInjected) {
  return (context) => {
    function visit(node) {
      if (!ts2.isCallExpression(node)) return ts2.visitEachChild(node, visit, context);
      if (!isFactoryCall(node, calleeNames)) return ts2.visitEachChild(node, visit, context);
      const arg = firstObjectArg(node);
      if (!arg) return node;
      const stylingNode = getProperty(arg, "styling");
      const stylingObj = asObject(stylingNode);
      if (!stylingObj) return ts2.visitEachChild(node, visit, context);
      const map = buildPrecomputedClasses(stylingObj);
      if (!map) return ts2.visitEachChild(node, visit, context);
      onInjected();
      const mapProps = Object.entries(map).map(
        ([k, v]) => factory.createPropertyAssignment(
          factory.createStringLiteral(k),
          factory.createStringLiteral(v)
        )
      );
      const mapLiteral = factory.createObjectLiteralExpression(mapProps, true);
      const precomputedProp = factory.createPropertyAssignment(
        factory.createIdentifier("precomputedClasses"),
        mapLiteral
      );
      const newStylingObj = factory.createObjectLiteralExpression(
        [...stylingObj.properties, precomputedProp],
        true
      );
      const newArgProps = arg.properties.map((p) => {
        if (ts2.isPropertyAssignment(p) && (ts2.isIdentifier(p.name) || ts2.isStringLiteral(p.name)) && p.name.text === "styling") {
          return factory.createPropertyAssignment(p.name, newStylingObj);
        }
        return p;
      });
      const newArg = factory.createObjectLiteralExpression(newArgProps, true);
      return factory.createCallExpression(node.expression, node.typeArguments, [
        newArg,
        ...node.arguments.slice(1)
      ]);
    }
    return (sourceFile) => ts2.visitEachChild(sourceFile, visit, context);
  };
}
function injectPrecomputedClasses(source, calleeNames) {
  let hasVariants = false;
  walk(source, (n) => {
    if (hasVariants) return;
    if (ts2.isPropertyAssignment(n) && (ts2.isIdentifier(n.name) || ts2.isStringLiteral(n.name)) && n.name.text === "variants")
      hasVariants = true;
  });
  if (!hasVariants) return null;
  let didInject = false;
  const result = ts2.transform(
    source,
    [
      createClassExtractTransformer(ts2.factory, calleeNames, () => {
        didInject = true;
      })
    ],
    { target: ts2.ScriptTarget.Latest }
  );
  if (!didInject) {
    result.dispose();
    return null;
  }
  const printer = ts2.createPrinter({ newLine: ts2.NewLineKind.LineFeed, removeComments: false });
  const output = printer.printFile(result.transformed[0]);
  result.dispose();
  return output;
}

// src/collect.ts
import ts3 from "typescript";
function extractBound(element) {
  const obj = asObject(element);
  if (!obj) return void 0;
  const cardinalityNode = getProperty(obj, "cardinality");
  const cardObj = asObject(cardinalityNode);
  let cardinality;
  if (cardObj) {
    const minNode = getProperty(cardObj, "min");
    const maxNode = getProperty(cardObj, "max");
    const min = asPositiveInt(minNode) ?? 0;
    const max = asPositiveInt(maxNode);
    if (min === 0 && max === void 0) {
      cardinality = { kind: "unbounded" };
    } else {
      cardinality = { kind: "bounded", min, max: max ?? Infinity };
    }
  } else {
    cardinality = { kind: "unbounded" };
  }
  const positionNode = getProperty(obj, "position");
  let position = "any";
  if (positionNode && ts3.isStringLiteral(positionNode)) {
    const p = positionNode.text;
    if (p === "first" || p === "last" || p === "any") position = p;
  }
  return { cardinality, position };
}
function cardinalityMin(c) {
  return c.kind === "bounded" ? c.min : 0;
}
function cardinalityMax(c) {
  return c.kind === "bounded" ? c.max : Infinity;
}
function processVariableStatement(node, calleeNames, out) {
  for (const decl of node.declarationList.declarations) {
    if (!decl.initializer || !ts3.isCallExpression(decl.initializer)) continue;
    if (!isFactoryCall(decl.initializer, calleeNames)) continue;
    const arg = firstObjectArg(decl.initializer);
    if (!arg) continue;
    const tagNode = getProperty(arg, "tag");
    const defaultTag = tagNode && ts3.isStringLiteral(tagNode) ? tagNode.text : void 0;
    const enforcementProp = getProperty(arg, "enforcement");
    const enfObj = asObject(enforcementProp);
    const ariaNode = enfObj ? getProperty(enfObj, "aria") : void 0;
    const ariaArr = asArray(ariaNode);
    const hasAriaRules = ariaArr !== void 0 && ariaArr.elements.length > 0;
    const childrenProp = enfObj ? getProperty(enfObj, "children") : void 0;
    const childrenArr = asArray(childrenProp);
    const rules = [];
    if (childrenArr) {
      for (const element of childrenArr.elements) {
        const bound = extractBound(element);
        if (bound) rules.push(bound);
      }
    }
    if (rules.length === 0 && !hasAriaRules && !defaultTag) continue;
    const totalMin = rules.reduce((s, r) => s + cardinalityMin(r.cardinality), 0);
    const totalMax = rules.reduce(
      (s, r) => s === Infinity ? Infinity : s + cardinalityMax(r.cardinality),
      0
    );
    const componentName = ts3.isIdentifier(decl.name) ? decl.name.text : void 0;
    if (!componentName) continue;
    out.push({
      name: componentName,
      rules,
      totalMin,
      totalMax,
      ...defaultTag !== void 0 && { defaultTag },
      hasAriaRules
    });
  }
}
function collectConstraints(source, calleeNames) {
  const constraints = [];
  walk(source, (node) => {
    if (ts3.isVariableStatement(node)) processVariableStatement(node, calleeNames, constraints);
  });
  return constraints;
}
function collectFileDeclarations(source, calleeNames) {
  const constraints = [];
  const importSpecifiers = /* @__PURE__ */ new Map();
  walk(source, (node) => {
    if (ts3.isVariableStatement(node)) {
      processVariableStatement(node, calleeNames, constraints);
    } else if (ts3.isImportDeclaration(node)) {
      const spec = node.moduleSpecifier;
      if (!ts3.isStringLiteral(spec)) return;
      const namedBindings = node.importClause?.namedBindings;
      if (!namedBindings || !ts3.isNamedImports(namedBindings)) return;
      for (const el of namedBindings.elements) importSpecifiers.set(el.name.text, spec.text);
    }
  });
  return { constraints, importSpecifiers };
}

// src/compound-prune.ts
import ts4 from "typescript";
function extractVariantMap2(stylingObj) {
  const result = /* @__PURE__ */ new Map();
  const variantsObj = asObject(getProperty(stylingObj, "variants"));
  if (!variantsObj) return result;
  for (const prop of variantsObj.properties) {
    if (!ts4.isPropertyAssignment(prop)) continue;
    const key = ts4.isIdentifier(prop.name) || ts4.isStringLiteral(prop.name) ? prop.name.text : void 0;
    if (!key) continue;
    const valuesObj = asObject(prop.initializer);
    if (!valuesObj) continue;
    const valid = /* @__PURE__ */ new Set();
    for (const vp of valuesObj.properties) {
      if (!ts4.isPropertyAssignment(vp)) continue;
      const vk = ts4.isIdentifier(vp.name) || ts4.isStringLiteral(vp.name) ? vp.name.text : void 0;
      if (vk) valid.add(vk);
    }
    result.set(key, valid);
  }
  return result;
}
function isDeadCompound(entry, variantMap) {
  for (const prop of entry.properties) {
    if (!ts4.isPropertyAssignment(prop)) continue;
    const key = ts4.isIdentifier(prop.name) || ts4.isStringLiteral(prop.name) ? prop.name.text : void 0;
    if (!key || key === "class") continue;
    const validValues = variantMap.get(key);
    if (!validValues) return true;
    const val = prop.initializer;
    if (ts4.isStringLiteral(val)) {
      if (!validValues.has(val.text)) return true;
    } else if (ts4.isArrayLiteralExpression(val)) {
      const allLiterals = val.elements.every(ts4.isStringLiteral);
      if (!allLiterals) continue;
      const hasAnyValid = val.elements.some((e) => ts4.isStringLiteral(e) && validValues.has(e.text));
      if (!hasAnyValid) return true;
    }
  }
  return false;
}
function createCompoundPruner(factory, calleeNames, onPruned) {
  return (context) => {
    function visit(node) {
      if (!ts4.isCallExpression(node)) return ts4.visitEachChild(node, visit, context);
      if (!isFactoryCall(node, calleeNames)) return ts4.visitEachChild(node, visit, context);
      const arg = firstObjectArg(node);
      if (!arg) return node;
      const stylingNode = getProperty(arg, "styling");
      const stylingObj = asObject(stylingNode);
      if (!stylingObj) return ts4.visitEachChild(node, visit, context);
      const compoundsNode = getProperty(stylingObj, "compounds");
      const compoundsArr = asArray(compoundsNode);
      if (!compoundsArr || compoundsArr.elements.length === 0)
        return ts4.visitEachChild(node, visit, context);
      const variantMap = extractVariantMap2(stylingObj);
      if (variantMap.size === 0) return ts4.visitEachChild(node, visit, context);
      const liveEntries = compoundsArr.elements.filter((elem) => {
        const obj = asObject(elem);
        return !obj || !isDeadCompound(obj, variantMap);
      });
      if (liveEntries.length === compoundsArr.elements.length)
        return ts4.visitEachChild(node, visit, context);
      onPruned();
      const newCompoundsArr = factory.createArrayLiteralExpression(liveEntries, true);
      const newStylingProps = stylingObj.properties.map((p) => {
        if (ts4.isPropertyAssignment(p) && (ts4.isIdentifier(p.name) || ts4.isStringLiteral(p.name)) && p.name.text === "compounds") {
          return factory.createPropertyAssignment(p.name, newCompoundsArr);
        }
        return p;
      });
      const newStylingObj = factory.createObjectLiteralExpression(newStylingProps, true);
      const newArgProps = arg.properties.map((p) => {
        if (ts4.isPropertyAssignment(p) && (ts4.isIdentifier(p.name) || ts4.isStringLiteral(p.name)) && p.name.text === "styling") {
          return factory.createPropertyAssignment(p.name, newStylingObj);
        }
        return p;
      });
      const newArg = factory.createObjectLiteralExpression(newArgProps, true);
      return factory.createCallExpression(node.expression, node.typeArguments, [
        newArg,
        ...node.arguments.slice(1)
      ]);
    }
    return (sourceFile) => ts4.visitEachChild(sourceFile, visit, context);
  };
}
function pruneDeadCompounds(source, calleeNames) {
  let hasCompounds = false;
  walk(source, (n) => {
    if (hasCompounds) return;
    if (ts4.isPropertyAssignment(n)) {
      const key = ts4.isIdentifier(n.name) || ts4.isStringLiteral(n.name) ? n.name.text : void 0;
      if (key === "compounds") hasCompounds = true;
    }
  });
  if (!hasCompounds) return null;
  let didPrune = false;
  const result = ts4.transform(
    source,
    [
      createCompoundPruner(ts4.factory, calleeNames, () => {
        didPrune = true;
      })
    ],
    { target: ts4.ScriptTarget.Latest }
  );
  if (!didPrune) {
    result.dispose();
    return null;
  }
  const printer = ts4.createPrinter({ newLine: ts4.NewLineKind.LineFeed, removeComments: false });
  const output = printer.printFile(result.transformed[0]);
  result.dispose();
  return output;
}

// src/constants.ts
var DEFAULT_CALLEE_NAMES = ["createPolymorphicComponent", "createContractComponent"];
var JSX_EXTS = /* @__PURE__ */ new Set(["tsx", "jsx"]);
var ALL_EXTS = /* @__PURE__ */ new Set(["ts", "tsx", "js", "jsx"]);

// src/diagnose.ts
import ts5 from "typescript";
function analyzeJsxSites(source, constraints, severity) {
  const byName = new Map(constraints.filter((c) => c.rules.length > 0).map((c) => [c.name, c]));
  const byNameAria = new Map(
    constraints.filter((c) => c.hasAriaRules && c.defaultTag !== void 0).map((c) => [c.name, c])
  );
  const diagnostics = [];
  const usages = [];
  walk(source, (node) => {
    let tagName;
    let attributes;
    let count;
    if (ts5.isJsxElement(node)) {
      const opening = node.openingElement;
      tagName = ts5.isIdentifier(opening.tagName) ? opening.tagName.text : void 0;
      attributes = opening.attributes;
      count = countStaticChildren(node);
    } else if (ts5.isJsxSelfClosingElement(node)) {
      tagName = ts5.isIdentifier(node.tagName) ? node.tagName.text : void 0;
      attributes = node.attributes;
      count = 0;
    }
    if (!tagName) return;
    let pos;
    const getPos = () => pos ??= source.getLineAndCharacterOfPosition(node.getStart(source));
    if (count !== void 0) {
      const c = byName.get(tagName);
      if (c && (count < c.totalMin || count > c.totalMax)) {
        const { line, character } = getPos();
        const { totalMin, totalMax, name } = c;
        const rangeText = totalMax === Infinity ? `at least ${totalMin}` : totalMin === totalMax ? `exactly ${totalMin}` : `${totalMin}\u2013${totalMax}`;
        diagnostics.push({
          message: `<${name}> expects ${rangeText} ${totalMax === 1 && totalMin === 1 ? "child" : "children"} but received ${count}.`,
          line: line + 1,
          col: character + 1,
          severity
        });
      }
    }
    if (attributes) {
      const c = byNameAria.get(tagName);
      if (c) {
        for (const attr of attributes.properties) {
          if (!ts5.isJsxAttribute(attr)) continue;
          const attrName = ts5.isIdentifier(attr.name) ? attr.name.text : void 0;
          if (attrName !== "as" || !attr.initializer) continue;
          let asValue;
          if (ts5.isStringLiteral(attr.initializer)) {
            asValue = attr.initializer.text;
          } else if (ts5.isJsxExpression(attr.initializer) && attr.initializer.expression !== void 0 && ts5.isStringLiteral(attr.initializer.expression)) {
            asValue = attr.initializer.expression.text;
          }
          if (asValue !== void 0 && asValue !== c.defaultTag) {
            const { line, character } = getPos();
            diagnostics.push({
              message: `<${tagName} as="${asValue}"> changes the element type from '${c.defaultTag}' \u2014 ARIA enforcement rules may not apply as expected.`,
              line: line + 1,
              col: character + 1,
              severity
            });
          }
        }
      }
    }
    if (/^[A-Z]/.test(tagName)) {
      const { line, character } = getPos();
      usages.push({ tagName, count, line: line + 1, col: character + 1 });
    }
  });
  return { diagnostics, usages };
}
function countStaticChildren(node) {
  let count = 0;
  for (const child of node.children) {
    if (ts5.isJsxExpression(child)) return void 0;
    if (ts5.isJsxText(child)) {
      if (child.text.trim().length > 0) count++;
    } else {
      count++;
    }
  }
  return count;
}
function diagnoseUsages(source, constraints, severity) {
  if (constraints.length === 0) return [];
  const byName = new Map(constraints.filter((c) => c.rules.length > 0).map((c) => [c.name, c]));
  const diagnostics = [];
  walk(source, (node) => {
    let tagName;
    let count;
    if (ts5.isJsxElement(node)) {
      const openTag = node.openingElement;
      tagName = ts5.isIdentifier(openTag.tagName) ? openTag.tagName.text : void 0;
      count = countStaticChildren(node);
    } else if (ts5.isJsxSelfClosingElement(node)) {
      tagName = ts5.isIdentifier(node.tagName) ? node.tagName.text : void 0;
      count = 0;
    }
    if (!tagName) return;
    const constraint = byName.get(tagName);
    if (!constraint) return;
    if (count === void 0) return;
    const { totalMin, totalMax, name } = constraint;
    if (count < totalMin || count > totalMax) {
      const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
      const rangeText = totalMax === Infinity ? `at least ${totalMin}` : totalMin === totalMax ? `exactly ${totalMin}` : `${totalMin}\u2013${totalMax}`;
      diagnostics.push({
        message: `<${name}> expects ${rangeText} ${totalMax === 1 && totalMin === 1 ? "child" : "children"} but received ${count}.`,
        line: line + 1,
        col: character + 1,
        severity
      });
    }
  });
  return diagnostics;
}

// src/registry.ts
var ConstraintRegistry = class {
  constraints = /* @__PURE__ */ new Map();
  importMap = /* @__PURE__ */ new Map();
  pending = /* @__PURE__ */ new Map();
  registerConstraints(fileId, cs) {
    this.constraints.set(fileId, new Map(cs.map((c) => [c.name, c])));
  }
  /** resolvedImports: local name → absolute file ID of the exporting module. */
  registerImports(fileId, resolvedImports) {
    this.importMap.set(fileId, resolvedImports);
  }
  addPendingUsage(fileId, usage) {
    let list = this.pending.get(fileId);
    if (!list) {
      list = [];
      this.pending.set(fileId, list);
    }
    list.push(usage);
  }
  /** Resolves a component name used in `fileId` to its constraint definition. */
  resolveConstraint(fileId, name) {
    const imports = this.importMap.get(fileId);
    if (!imports) return void 0;
    const sourceId = imports.get(name);
    if (!sourceId) return void 0;
    return this.constraints.get(sourceId)?.get(name);
  }
  /** Returns cardinality violations across all pending cross-file usages. */
  diagnostics(severity) {
    const result = [];
    for (const [fileId, usages] of this.pending) {
      for (const usage of usages) {
        if (usage.count === void 0) continue;
        const constraint = this.resolveConstraint(fileId, usage.tagName);
        if (!constraint) continue;
        const { totalMin, totalMax, name } = constraint;
        if (usage.count >= totalMin && usage.count <= totalMax) continue;
        const rangeText = totalMax === Infinity ? `at least ${totalMin}` : totalMin === totalMax ? `exactly ${totalMin}` : `${totalMin}\u2013${totalMax}`;
        const childWord = totalMax === 1 && totalMin === 1 ? "child" : "children";
        result.push({
          fileId,
          message: `<${name}> expects ${rangeText} ${childWord} but received ${usage.count}.`,
          line: usage.line,
          col: usage.col,
          severity
        });
      }
    }
    return result;
  }
};

// src/slot-transform.ts
import ts6 from "typescript";
function isUpperCase(s) {
  return s.charCodeAt(0) >= 65 && s.charCodeAt(0) <= 90;
}
function jsxAttrName(attr) {
  return ts6.isIdentifier(attr.name) ? attr.name.text : "";
}
function getStaticClassName(child) {
  const attrs = ts6.isJsxElement(child) ? child.openingElement.attributes.properties : child.attributes.properties;
  for (const attr of attrs) {
    if (!ts6.isJsxAttribute(attr) || jsxAttrName(attr) !== "className") continue;
    const init = attr.initializer;
    if (!init) return { absent: false, value: "" };
    if (ts6.isStringLiteral(init)) return { absent: false, value: init.text };
    if (ts6.isJsxExpression(init) && init.expression !== void 0 && ts6.isStringLiteral(init.expression))
      return { absent: false, value: init.expression.text };
    return null;
  }
  return { absent: true };
}
function getStyleInfo(child) {
  const attrs = ts6.isJsxElement(child) ? child.openingElement.attributes.properties : child.attributes.properties;
  for (const attr of attrs) {
    if (!ts6.isJsxAttribute(attr) || jsxAttrName(attr) !== "style") continue;
    const init = attr.initializer;
    if (!init || ts6.isStringLiteral(init)) return null;
    if (ts6.isJsxExpression(init) && init.expression !== void 0)
      return { absent: false, expr: init.expression };
    return null;
  }
  return { absent: true };
}
function getEventHandlers(child) {
  const attrs = ts6.isJsxElement(child) ? child.openingElement.attributes.properties : child.attributes.properties;
  const handlers = [];
  for (const attr of attrs) {
    if (!ts6.isJsxAttribute(attr)) continue;
    const name = jsxAttrName(attr);
    if (!/^on[A-Z]/.test(name)) continue;
    const init = attr.initializer;
    if (!init) return null;
    if (ts6.isJsxExpression(init) && init.expression !== void 0) {
      handlers.push({ name, expr: init.expression });
      continue;
    }
    return null;
  }
  return handlers;
}
function hasAsChild(opening) {
  for (const attr of opening.attributes.properties) {
    if (!ts6.isJsxAttribute(attr)) continue;
    if (jsxAttrName(attr) !== "asChild") continue;
    if (attr.initializer === void 0) return true;
    if (ts6.isJsxExpression(attr.initializer) && attr.initializer.expression !== void 0 && attr.initializer.expression.kind === ts6.SyntaxKind.TrueKeyword)
      return true;
  }
  return false;
}
function getSingleElementChild(node) {
  const meaningful = [];
  for (const child of node.children) {
    if (ts6.isJsxText(child)) {
      if (child.text.trim().length > 0) return void 0;
      continue;
    }
    if (ts6.isJsxExpression(child)) return void 0;
    if (ts6.isJsxElement(child) || ts6.isJsxSelfClosingElement(child)) {
      meaningful.push(child);
      continue;
    }
    return void 0;
  }
  return meaningful.length === 1 ? meaningful[0] : void 0;
}
function getTagName(child) {
  const tag = ts6.isJsxElement(child) ? child.openingElement.tagName : child.tagName;
  return ts6.isIdentifier(tag) ? tag.text : void 0;
}
function buildTransformedAttributes(factory, original, child, tagName, clsResult, styleInfo, handlers) {
  const parentAttrs = original.attributes.properties.filter(
    (attr) => !(ts6.isJsxAttribute(attr) && jsxAttrName(attr) === "asChild")
  );
  const hasStaticCls = !clsResult.absent;
  const hasStyle = !styleInfo.absent;
  const handlerNames = new Set(handlers.map((h) => h.name));
  const childOpeningAttrs = (ts6.isJsxElement(child) ? child.openingElement.attributes.properties : child.attributes.properties).filter(
    (attr) => !(ts6.isJsxAttribute(attr) && (jsxAttrName(attr) === "ref" || hasStaticCls && jsxAttrName(attr) === "className" || hasStyle && jsxAttrName(attr) === "style" || handlerNames.has(jsxAttrName(attr))))
  );
  const childContent = ts6.isJsxElement(child) ? child.children : void 0;
  const spreadProp = factory.createJsxSpreadAttribute(factory.createIdentifier("_p"));
  const extraAttrs = [];
  if (hasStaticCls && clsResult.value !== "") {
    const mergedExpr = factory.createBinaryExpression(
      factory.createPropertyAccessExpression(factory.createIdentifier("_p"), "className"),
      ts6.SyntaxKind.PlusToken,
      factory.createStringLiteral(` ${clsResult.value}`)
    );
    extraAttrs.push(
      factory.createJsxAttribute(
        factory.createIdentifier("className"),
        factory.createJsxExpression(void 0, mergedExpr)
      )
    );
  }
  if (hasStyle) {
    const styleExpr = styleInfo.expr;
    const pStyleSpread = factory.createSpreadAssignment(
      factory.createPropertyAccessExpression(factory.createIdentifier("_p"), "style")
    );
    let mergedStyleObj;
    if (ts6.isObjectLiteralExpression(styleExpr)) {
      mergedStyleObj = factory.createObjectLiteralExpression(
        [pStyleSpread, ...styleExpr.properties],
        false
      );
    } else {
      mergedStyleObj = factory.createObjectLiteralExpression(
        [pStyleSpread, factory.createSpreadAssignment(styleExpr)],
        false
      );
    }
    extraAttrs.push(
      factory.createJsxAttribute(
        factory.createIdentifier("style"),
        factory.createJsxExpression(void 0, mergedStyleObj)
      )
    );
  }
  for (const { name, expr } of handlers) {
    const eParam = factory.createParameterDeclaration(void 0, void 0, "_e");
    const callChild = factory.createExpressionStatement(
      factory.createCallExpression(factory.createParenthesizedExpression(expr), void 0, [
        factory.createIdentifier("_e")
      ])
    );
    const callParent = factory.createExpressionStatement(
      factory.createCallChain(
        factory.createPropertyAccessExpression(factory.createIdentifier("_p"), name),
        factory.createToken(ts6.SyntaxKind.QuestionDotToken),
        void 0,
        [factory.createIdentifier("_e")]
      )
    );
    const composedFn = factory.createArrowFunction(
      void 0,
      void 0,
      [eParam],
      void 0,
      factory.createToken(ts6.SyntaxKind.EqualsGreaterThanToken),
      factory.createBlock([callChild, callParent], true)
    );
    extraAttrs.push(
      factory.createJsxAttribute(
        factory.createIdentifier(name),
        factory.createJsxExpression(void 0, composedFn)
      )
    );
  }
  const childAttrsWithSpread = factory.createJsxAttributes([
    ...childOpeningAttrs,
    spreadProp,
    ...extraAttrs
  ]);
  const childElement = ts6.isJsxElement(child) ? factory.createJsxElement(
    factory.createJsxOpeningElement(
      factory.createIdentifier(tagName),
      void 0,
      childAttrsWithSpread
    ),
    childContent ?? [],
    factory.createJsxClosingElement(factory.createIdentifier(tagName))
  ) : factory.createJsxSelfClosingElement(
    factory.createIdentifier(tagName),
    void 0,
    childAttrsWithSpread
  );
  const renderArrow = factory.createArrowFunction(
    void 0,
    void 0,
    [factory.createParameterDeclaration(void 0, void 0, "_p")],
    void 0,
    factory.createToken(ts6.SyntaxKind.EqualsGreaterThanToken),
    factory.createParenthesizedExpression(childElement)
  );
  const renderAttr = factory.createJsxAttribute(
    factory.createIdentifier("render"),
    factory.createJsxExpression(void 0, renderArrow)
  );
  return factory.createJsxAttributes([renderAttr, ...parentAttrs]);
}
function createAsChildTransformer(factory) {
  return (context) => {
    function visit(node) {
      if (!ts6.isJsxElement(node)) return ts6.visitEachChild(node, visit, context);
      const opening = node.openingElement;
      const tagName = ts6.isIdentifier(opening.tagName) ? opening.tagName.text : void 0;
      if (!tagName || !isUpperCase(tagName)) {
        return ts6.visitEachChild(node, visit, context);
      }
      if (!hasAsChild(opening)) return ts6.visitEachChild(node, visit, context);
      const child = getSingleElementChild(node);
      if (!child) return ts6.visitEachChild(node, visit, context);
      const clsResult = getStaticClassName(child);
      if (clsResult === null) return ts6.visitEachChild(node, visit, context);
      const styleInfo = getStyleInfo(child);
      if (styleInfo === null) return ts6.visitEachChild(node, visit, context);
      const handlers = getEventHandlers(child);
      if (handlers === null) return ts6.visitEachChild(node, visit, context);
      const childTag = getTagName(child);
      if (!childTag) return ts6.visitEachChild(node, visit, context);
      const newAttrs = buildTransformedAttributes(
        factory,
        opening,
        child,
        childTag,
        clsResult,
        styleInfo,
        handlers
      );
      return factory.createJsxSelfClosingElement(opening.tagName, opening.typeArguments, newAttrs);
    }
    return (sourceFile) => ts6.visitEachChild(sourceFile, visit, context);
  };
}
function transformAsChild(source) {
  let hasAny = false;
  walk(source, (n) => {
    if (hasAny) return;
    if (ts6.isJsxAttribute(n) && jsxAttrName(n) === "asChild") hasAny = true;
  });
  if (!hasAny) return null;
  const result = ts6.transform(source, [createAsChildTransformer(ts6.factory)], {
    jsx: ts6.JsxEmit.Preserve,
    target: ts6.ScriptTarget.Latest
  });
  const printer = ts6.createPrinter({ newLine: ts6.NewLineKind.LineFeed, removeComments: false });
  const output = printer.printFile(result.transformed[0]);
  result.dispose();
  return output;
}

// src/static-compose.ts
import ts7 from "typescript";
function asStringLiteral(node) {
  return node !== void 0 && ts7.isStringLiteral(node) ? node.text : void 0;
}
function extractStaticComponents(source, calleeNames) {
  const result = /* @__PURE__ */ new Map();
  walk(source, (node) => {
    if (!ts7.isVariableDeclaration(node)) return;
    if (!ts7.isIdentifier(node.name)) return;
    const varName = node.name.text;
    const init = node.initializer;
    if (!init) return;
    let call;
    if (ts7.isCallExpression(init) && isFactoryCall(init, calleeNames)) {
      call = init;
    } else if (ts7.isAsExpression(init) && ts7.isCallExpression(init.expression) && isFactoryCall(init.expression, calleeNames)) {
      call = init.expression;
    }
    if (!call) return;
    const arg = firstObjectArg(call);
    if (!arg) return;
    const defaultTag = asStringLiteral(getProperty(arg, "tag"));
    if (!defaultTag) return;
    const stylingObj = asObject(getProperty(arg, "styling"));
    if (!stylingObj) return;
    const precomputedNode = asObject(getProperty(stylingObj, "precomputedClasses"));
    if (!precomputedNode) return;
    const precomputedClasses = {};
    for (const prop of precomputedNode.properties) {
      if (!ts7.isPropertyAssignment(prop)) return;
      const key = ts7.isStringLiteral(prop.name) ? prop.name.text : void 0;
      const val = asStringLiteral(prop.initializer);
      if (key === void 0 || val === void 0) return;
      precomputedClasses[key] = val;
    }
    if (getProperty(arg, "defaults") !== void 0) return;
    if (getProperty(arg, "enforcement") !== void 0) return;
    const variantKeys = /* @__PURE__ */ new Set();
    const variantsObj = asObject(getProperty(stylingObj, "variants"));
    if (variantsObj) {
      for (const prop of variantsObj.properties) {
        if (ts7.isPropertyAssignment(prop) && (ts7.isIdentifier(prop.name) || ts7.isStringLiteral(prop.name))) {
          variantKeys.add(prop.name.text);
        }
      }
    }
    result.set(varName, { defaultTag, variantKeys, precomputedClasses });
  });
  return result;
}
function readAttrValue(attrs, name) {
  for (const attr of attrs) {
    if (!ts7.isJsxAttribute(attr)) continue;
    if (!(ts7.isIdentifier(attr.name) && attr.name.text === name)) continue;
    const init = attr.initializer;
    if (!init) return { kind: "string", value: "" };
    if (ts7.isStringLiteral(init)) return { kind: "string", value: init.text };
    if (ts7.isJsxExpression(init) && init.expression !== void 0) {
      if (ts7.isStringLiteral(init.expression))
        return { kind: "string", value: init.expression.text };
      return { kind: "dynamic" };
    }
    return { kind: "dynamic" };
  }
  return { kind: "absent" };
}
function createStaticCompositionTransformer(factory, components, onInlined) {
  return (context) => {
    function visit(node) {
      const isSelfClose = ts7.isJsxSelfClosingElement(node);
      const isOpen = ts7.isJsxElement(node);
      if (!isSelfClose && !isOpen) return ts7.visitEachChild(node, visit, context);
      const tagNode = isOpen ? node.openingElement.tagName : node.tagName;
      if (!ts7.isIdentifier(tagNode)) return ts7.visitEachChild(node, visit, context);
      const info = components.get(tagNode.text);
      if (!info) return ts7.visitEachChild(node, visit, context);
      const attrList = isOpen ? node.openingElement.attributes.properties : node.attributes.properties;
      if (attrList.some(ts7.isJsxSpreadAttribute)) return ts7.visitEachChild(node, visit, context);
      if (readAttrValue(attrList, "asChild").kind !== "absent")
        return ts7.visitEachChild(node, visit, context);
      if (readAttrValue(attrList, "render").kind !== "absent")
        return ts7.visitEachChild(node, visit, context);
      const asVal = readAttrValue(attrList, "as");
      if (asVal.kind === "dynamic") return ts7.visitEachChild(node, visit, context);
      const outputTag = asVal.kind === "string" ? asVal.value : info.defaultTag;
      const variantProps = {};
      for (const propName of info.variantKeys) {
        const val = readAttrValue(attrList, propName);
        if (val.kind === "absent") continue;
        if (val.kind === "string") {
          variantProps[propName] = val.value;
          continue;
        }
        return ts7.visitEachChild(node, visit, context);
      }
      const cacheKey = buildCacheKey(variantProps);
      const baseClass = info.precomputedClasses[cacheKey];
      if (baseClass === void 0) return ts7.visitEachChild(node, visit, context);
      const clsVal = readAttrValue(attrList, "className");
      if (clsVal.kind === "dynamic") return ts7.visitEachChild(node, visit, context);
      const finalClass = clsVal.kind === "string" && clsVal.value ? `${baseClass} ${clsVal.value}` : baseClass;
      const strip = /* @__PURE__ */ new Set([...info.variantKeys, "as", "asChild", "render", "className"]);
      const outputAttrs = [
        factory.createJsxAttribute(
          factory.createIdentifier("className"),
          factory.createStringLiteral(finalClass)
        )
      ];
      for (const attr of attrList) {
        if (ts7.isJsxSpreadAttribute(attr)) continue;
        if (!ts7.isJsxAttribute(attr)) continue;
        const name = ts7.isIdentifier(attr.name) ? attr.name.text : "";
        if (strip.has(name)) continue;
        outputAttrs.push(attr);
      }
      const newAttrs = factory.createJsxAttributes(outputAttrs);
      const outputTagIdent = factory.createIdentifier(outputTag);
      onInlined();
      if (isSelfClose) {
        return factory.createJsxSelfClosingElement(outputTagIdent, void 0, newAttrs);
      }
      const openNode = node;
      const visitedChildren = openNode.children.map((c) => ts7.visitNode(c, visit));
      return factory.createJsxElement(
        factory.createJsxOpeningElement(outputTagIdent, void 0, newAttrs),
        visitedChildren,
        factory.createJsxClosingElement(outputTagIdent)
      );
    }
    return (sourceFile) => ts7.visitEachChild(sourceFile, visit, context);
  };
}
function composeStatically(source, calleeNames) {
  const components = extractStaticComponents(source, calleeNames);
  if (components.size === 0) return null;
  const componentNames = new Set(components.keys());
  let hasEligibleTag = false;
  walk(source, (n) => {
    if (hasEligibleTag) return;
    const tagNode = ts7.isJsxElement(n) ? n.openingElement.tagName : ts7.isJsxSelfClosingElement(n) ? n.tagName : void 0;
    if (tagNode && ts7.isIdentifier(tagNode) && componentNames.has(tagNode.text))
      hasEligibleTag = true;
  });
  if (!hasEligibleTag) return null;
  let didInline = false;
  const transformResult = ts7.transform(
    source,
    [
      createStaticCompositionTransformer(ts7.factory, components, () => {
        didInline = true;
      })
    ],
    { jsx: ts7.JsxEmit.Preserve, target: ts7.ScriptTarget.Latest }
  );
  if (!didInline) {
    transformResult.dispose();
    return null;
  }
  const printer = ts7.createPrinter({ newLine: ts7.NewLineKind.LineFeed, removeComments: false });
  const output = printer.printFile(transformResult.transformed[0]);
  transformResult.dispose();
  return output;
}

// src/analyze.ts
function analyze(code, filename, options) {
  const ext = filename.split(".").pop() ?? "";
  if (!JSX_EXTS.has(ext)) return [];
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES);
  const severity = options?.severity ?? "warning";
  const source = parseSource(filename, code);
  const constraints = collectConstraints(source, calleeNames);
  return diagnoseUsages(source, constraints, severity);
}

// src/design-tokens.ts
import { writeFileSync } from "fs";
import { resolve } from "path";
import ts8 from "typescript";
function collectStringValues(node, out) {
  if (!node) return;
  if (ts8.isStringLiteral(node)) {
    if (node.text.trim()) out.push(node.text);
    return;
  }
  if (ts8.isArrayLiteralExpression(node)) {
    for (const elem of node.elements) collectStringValues(elem, out);
  }
}
function extractStylingTokens(stylingObj) {
  const base = [];
  const variantClasses = [];
  const compoundClasses = [];
  const tagClasses = [];
  collectStringValues(getProperty(stylingObj, "base"), base);
  const variantsObj = asObject(getProperty(stylingObj, "variants"));
  if (variantsObj) {
    for (const dimProp of variantsObj.properties) {
      if (!ts8.isPropertyAssignment(dimProp)) continue;
      const valuesObj = asObject(dimProp.initializer);
      if (!valuesObj) continue;
      for (const vp of valuesObj.properties) {
        if (!ts8.isPropertyAssignment(vp)) continue;
        collectStringValues(vp.initializer, variantClasses);
      }
    }
  }
  const compoundsArr = asArray(getProperty(stylingObj, "compounds"));
  if (compoundsArr) {
    for (const elem of compoundsArr.elements) {
      const obj = asObject(elem);
      if (!obj) continue;
      collectStringValues(getProperty(obj, "class"), compoundClasses);
    }
  }
  const tagsObj = asObject(getProperty(stylingObj, "tags"));
  if (tagsObj) {
    for (const tp of tagsObj.properties) {
      if (!ts8.isPropertyAssignment(tp)) continue;
      collectStringValues(tp.initializer, tagClasses);
    }
  }
  return { base, variantClasses, compoundClasses, tagClasses };
}
function collectFileTokens(source, calleeNames) {
  const result = /* @__PURE__ */ new Map();
  ts8.forEachChild(source, (stmt) => {
    if (!ts8.isVariableStatement(stmt)) return;
    for (const decl of stmt.declarationList.declarations) {
      if (!decl.initializer || !ts8.isCallExpression(decl.initializer)) continue;
      if (!isFactoryCall(decl.initializer, calleeNames)) continue;
      const arg = firstObjectArg(decl.initializer);
      if (!arg) continue;
      const stylingNode = getProperty(arg, "styling");
      const stylingObj = asObject(stylingNode);
      if (!stylingObj) continue;
      const name = ts8.isIdentifier(decl.name) ? decl.name.text : void 0;
      if (!name) continue;
      result.set(name, extractStylingTokens(stylingObj));
    }
  });
  return result;
}
function mergeTokens(existing, incoming) {
  if (!existing) return incoming;
  return {
    base: [.../* @__PURE__ */ new Set([...existing.base, ...incoming.base])],
    variantClasses: [.../* @__PURE__ */ new Set([...existing.variantClasses, ...incoming.variantClasses])],
    compoundClasses: [.../* @__PURE__ */ new Set([...existing.compoundClasses, ...incoming.compoundClasses])],
    tagClasses: [.../* @__PURE__ */ new Set([...existing.tagClasses, ...incoming.tagClasses])]
  };
}
function buildManifest(allTokens) {
  const components = {};
  const seen = /* @__PURE__ */ new Set();
  for (const [name, tokens] of allTokens) {
    components[name] = tokens;
    for (const cls of [
      ...tokens.base,
      ...tokens.variantClasses,
      ...tokens.compoundClasses,
      ...tokens.tagClasses
    ]) {
      for (const part of cls.split(/\s+/)) {
        if (part) seen.add(part);
      }
    }
  }
  return {
    components,
    allClasses: [...seen].sort()
  };
}
function designTokensPlugin(options) {
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES);
  const outFile = options?.outFile ?? "praxis-tokens.json";
  const accumulated = /* @__PURE__ */ new Map();
  return {
    name: "praxis-ui:design-tokens",
    transform(code, id) {
      const ext = id.split(".").pop() ?? "";
      if (!ALL_EXTS.has(ext)) return null;
      const source = parseSource(id, code);
      for (const [name, tokens] of collectFileTokens(source, calleeNames)) {
        accumulated.set(name, mergeTokens(accumulated.get(name), tokens));
      }
      return null;
    },
    writeBundle() {
      if (accumulated.size === 0) return;
      const manifest = buildManifest(accumulated);
      const root = this.config?.root ?? process.cwd();
      writeFileSync(resolve(root, outFile), JSON.stringify(manifest, null, 2));
    }
  };
}

// src/index.ts
function contractPlugin(options) {
  const registry = new ConstraintRegistry();
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES);
  const severity = options?.severity ?? "warning";
  return {
    name: "praxis-ui:contract",
    async transform(code, id) {
      const ext = id.split(".").pop() ?? "";
      if (!JSX_EXTS.has(ext)) return null;
      const source = parseSource(id, code);
      const { constraints, importSpecifiers } = collectFileDeclarations(source, calleeNames);
      registry.registerConstraints(id, constraints);
      const { diagnostics, usages: allUsages } = analyzeJsxSites(source, constraints, severity);
      for (const d of diagnostics) {
        const loc = { file: id, line: d.line, column: d.col };
        if (d.severity === "error") {
          this.error({ message: d.message, loc });
        } else {
          this.warn({ message: d.message, loc });
        }
      }
      const localNames = new Set(constraints.map((c) => c.name));
      const importedTagsInUse = new Set(
        allUsages.filter((u) => !localNames.has(u.tagName) && importSpecifiers.has(u.tagName)).map((u) => u.tagName)
      );
      if (importedTagsInUse.size > 0) {
        const resolvedImports = /* @__PURE__ */ new Map();
        for (const [name, specifier] of importSpecifiers) {
          if (!importedTagsInUse.has(name)) continue;
          const resolved = await this.resolve(specifier, id);
          if (resolved) resolvedImports.set(name, resolved.id);
        }
        registry.registerImports(id, resolvedImports);
        for (const usage of allUsages) {
          if (importedTagsInUse.has(usage.tagName)) {
            registry.addPendingUsage(id, usage);
          }
        }
      }
    },
    buildEnd() {
      for (const d of registry.diagnostics(severity)) {
        const loc = { file: d.fileId, line: d.line, column: d.col };
        if (d.severity === "error") {
          this.error({ message: d.message, loc });
        } else {
          this.warn({ message: d.message, loc });
        }
      }
    }
  };
}
function compoundPrunePlugin(options) {
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES);
  return {
    name: "praxis-ui:compound-prune",
    transform(code, id) {
      const ext = id.split(".").pop() ?? "";
      if (!ALL_EXTS.has(ext)) return null;
      const result = pruneDeadCompounds(parseSource(id, code), calleeNames);
      return result !== null ? { code: result } : null;
    }
  };
}
function classExtractPlugin(options) {
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES);
  return {
    name: "praxis-ui:class-extract",
    transform(code, id) {
      const ext = id.split(".").pop() ?? "";
      if (!ALL_EXTS.has(ext)) return null;
      const result = injectPrecomputedClasses(parseSource(id, code), calleeNames);
      return result !== null ? { code: result } : null;
    }
  };
}
function slotTransformPlugin() {
  return {
    name: "praxis-ui:slot-transform",
    transform(code, id) {
      const ext = id.split(".").pop() ?? "";
      if (!JSX_EXTS.has(ext)) return null;
      const result = transformAsChild(parseSource(id, code));
      return result !== null ? { code: result } : null;
    }
  };
}
function staticCompositionPlugin(options) {
  const calleeNames = new Set(options?.calleeNames ?? DEFAULT_CALLEE_NAMES);
  return {
    name: "praxis-ui:static-compose",
    transform(code, id) {
      const ext = id.split(".").pop() ?? "";
      if (!JSX_EXTS.has(ext)) return null;
      const result = composeStatically(parseSource(id, code), calleeNames);
      return result !== null ? { code: result } : null;
    }
  };
}
function ssrOptimizePlugin(options) {
  return [slotTransformPlugin(), classExtractPlugin(options), staticCompositionPlugin(options)];
}
export {
  analyze,
  buildManifest,
  buildPrecomputedClasses,
  classExtractPlugin,
  collectFileTokens,
  composeStatically,
  compoundPrunePlugin,
  contractPlugin,
  designTokensPlugin,
  injectPrecomputedClasses,
  pruneDeadCompounds,
  slotTransformPlugin,
  ssrOptimizePlugin,
  staticCompositionPlugin,
  transformAsChild
};
