import ts from 'typescript'
import { walk } from './ast'

/**
 * Extracts named import bindings from a source file.
 * Returns a Map from local binding name to the module specifier string.
 *
 * `import { Button } from './button'` → Map { 'Button' => './button' }
 * `import { Button as Btn } from './button'` → Map { 'Btn' => './button' }
 *
 * Default imports and namespace imports (`* as X`) are ignored — only named
 * bindings that could correspond to component identifiers in JSX are collected.
 */
export function extractImportSpecifiers(source: ts.SourceFile): Map<string, string> {
  const result = new Map<string, string>()

  walk(source, (node) => {
    if (!ts.isImportDeclaration(node)) return
    const moduleSpecifier = node.moduleSpecifier
    if (!ts.isStringLiteral(moduleSpecifier)) return
    const specifier = moduleSpecifier.text

    const namedBindings = node.importClause?.namedBindings
    if (!namedBindings || !ts.isNamedImports(namedBindings)) return

    for (const element of namedBindings.elements) {
      result.set(element.name.text, specifier)
    }
  })

  return result
}
