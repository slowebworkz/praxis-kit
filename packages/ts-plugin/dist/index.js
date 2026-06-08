"use strict";

// src/ast.ts
function getObjectProperty(ts, obj, key) {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = prop.name;
    if (ts.isIdentifier(name) && name.text === key) return prop;
    if (ts.isStringLiteral(name) && name.text === key) return prop;
  }
  return void 0;
}
function asObjectLiteralExpression(ts, node) {
  if (!node) return void 0;
  return ts.isObjectLiteralExpression(node) ? node : void 0;
}
function asArrayLiteralExpression(ts, node) {
  if (!node) return void 0;
  return ts.isArrayLiteralExpression(node) ? node : void 0;
}
function asNumericValue(ts, node) {
  if (!node) return void 0;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isPrefixUnaryExpression(node) && (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken) && ts.isNumericLiteral(node.operand)) {
    const val = Number(node.operand.text);
    return node.operator === ts.SyntaxKind.MinusToken ? -val : val;
  }
  return void 0;
}
function isFactoryCall(ts, node, names) {
  const { expression } = node;
  if (ts.isIdentifier(expression)) return names.has(expression.text);
  if (ts.isPropertyAccessExpression(expression)) return names.has(expression.name.text);
  return false;
}
function getFirstObjectArg(ts, node) {
  const [first] = node.arguments;
  if (!first) return void 0;
  return ts.isObjectLiteralExpression(first) ? first : void 0;
}

// src/diagnostics/walk-enforcement.ts
function walkEnforcement(ts, sourceFile, calleeNames, cb) {
  function visit(node) {
    if (ts.isCallExpression(node) && isFactoryCall(ts, node, calleeNames)) {
      const arg = getFirstObjectArg(ts, node);
      if (arg) {
        const enfProp = getObjectProperty(ts, arg, "enforcement");
        if (enfProp) {
          const enf = asObjectLiteralExpression(ts, enfProp.initializer);
          if (enf) cb(node, enf);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

// src/diagnostics/no-enforcement-without-strict.ts
var MISSING_STRICT_CODE = 90001;
function checkNoEnforcementWithoutStrict(ts, sourceFile, calleeNames) {
  const diagnostics = [];
  walkEnforcement(ts, sourceFile, calleeNames, (node, enf) => {
    const hasStrict = getObjectProperty(ts, enf, "strict") !== void 0;
    if (!hasStrict) {
      for (const field of ["children", "aria"]) {
        const fieldProp = getObjectProperty(ts, enf, field);
        if (!fieldProp) continue;
        if (field === "children") {
          const arr = asArrayLiteralExpression(ts, fieldProp.initializer);
          if (!arr || arr.elements.length === 0) continue;
        }
        diagnostics.push({
          file: sourceFile,
          start: node.getStart(sourceFile),
          length: node.getWidth(sourceFile),
          category: ts.DiagnosticCategory.Warning,
          code: MISSING_STRICT_CODE,
          messageText: `enforcement.${field} is defined but enforcement.strict is not explicitly set. Adapter defaults vary \u2014 declare strict explicitly so the behavior is clear at the call site.`,
          source: "@praxis-ui/ts-plugin"
        });
        break;
      }
    }
  });
  return diagnostics;
}

// src/diagnostics/valid-cardinality.ts
var NEGATIVE_MIN_CODE = 90002;
var NEGATIVE_MAX_CODE = 90003;
var MAX_LESS_THAN_MIN_CODE = 90004;
var ZERO_MAX_CODE = 90005;
function checkValidCardinality(ts, sourceFile, calleeNames) {
  const diagnostics = [];
  walkEnforcement(ts, sourceFile, calleeNames, (_, enf) => {
    const childrenProp = getObjectProperty(ts, enf, "children");
    if (!childrenProp) return;
    const arr = asArrayLiteralExpression(ts, childrenProp.initializer);
    if (!arr) return;
    for (const element of arr.elements) {
      if (!ts.isObjectLiteralExpression(element)) continue;
      const cardProp = getObjectProperty(ts, element, "cardinality");
      if (!cardProp) continue;
      const card = asObjectLiteralExpression(ts, cardProp.initializer);
      if (!card) continue;
      const minProp = getObjectProperty(ts, card, "min");
      const maxProp = getObjectProperty(ts, card, "max");
      const min = minProp ? asNumericValue(ts, minProp.initializer) : void 0;
      const max = maxProp ? asNumericValue(ts, maxProp.initializer) : void 0;
      if (min !== void 0 && min < 0) {
        diagnostics.push({
          file: sourceFile,
          start: minProp.getStart(sourceFile),
          length: minProp.getWidth(sourceFile),
          category: ts.DiagnosticCategory.Error,
          code: NEGATIVE_MIN_CODE,
          messageText: `cardinality.min must be >= 0 (got ${min}).`,
          source: "@praxis-ui/ts-plugin"
        });
      }
      if (max !== void 0 && max < 0) {
        diagnostics.push({
          file: sourceFile,
          start: maxProp.getStart(sourceFile),
          length: maxProp.getWidth(sourceFile),
          category: ts.DiagnosticCategory.Error,
          code: NEGATIVE_MAX_CODE,
          messageText: `cardinality.max must be >= 0 (got ${max}).`,
          source: "@praxis-ui/ts-plugin"
        });
      }
      if (max !== void 0 && max === 0) {
        diagnostics.push({
          file: sourceFile,
          start: maxProp.getStart(sourceFile),
          length: maxProp.getWidth(sourceFile),
          category: ts.DiagnosticCategory.Warning,
          code: ZERO_MAX_CODE,
          messageText: `cardinality.max of 0 means no children of this type are allowed. Use 0 intentionally or remove the rule.`,
          source: "@praxis-ui/ts-plugin"
        });
      }
      if (min !== void 0 && max !== void 0 && min >= 0 && max > 0 && max < min) {
        diagnostics.push({
          file: sourceFile,
          start: cardProp.getStart(sourceFile),
          length: cardProp.getWidth(sourceFile),
          category: ts.DiagnosticCategory.Error,
          code: MAX_LESS_THAN_MIN_CODE,
          messageText: `cardinality.max (${max}) must be >= cardinality.min (${min}). This rule can never be satisfied.`,
          source: "@praxis-ui/ts-plugin"
        });
      }
    }
  });
  return diagnostics;
}

// src/index.ts
var DEFAULT_CALLEE_NAMES = ["createContractComponent"];
function init(modules) {
  const ts = modules.typescript;
  function create(info) {
    const calleeNames = new Set(
      info.config.calleeNames ?? DEFAULT_CALLEE_NAMES
    );
    const proxy = /* @__PURE__ */ Object.create(null);
    const proxyRecord = proxy;
    for (const k of Object.keys(info.languageService)) {
      const x = info.languageService[k];
      proxyRecord[k] = typeof x === "function" ? x.bind(info.languageService) : x;
    }
    proxy.getSemanticDiagnostics = (fileName) => {
      const existing = info.languageService.getSemanticDiagnostics(fileName);
      const program = info.languageService.getProgram();
      if (!program) return existing;
      const sourceFile = program.getSourceFile(fileName);
      if (!sourceFile) return existing;
      const extra = [
        ...checkNoEnforcementWithoutStrict(ts, sourceFile, calleeNames),
        ...checkValidCardinality(ts, sourceFile, calleeNames)
      ];
      return [...existing, ...extra];
    };
    return proxy;
  }
  return { create };
}
module.exports = init;
