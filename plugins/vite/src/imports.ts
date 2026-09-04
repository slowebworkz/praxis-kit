import ts from 'typescript'
import { walkEach } from './ast'
import { iterate } from '@praxis-kit/primitive'

export type ImportBinding = {
  /** The exported name in the source module (the name before `as`, if any). */
  readonly importedName: string
  /** The module specifier string (e.g. `'./Button'`). */
  readonly specifier: string
}

/**
 * Extracts named import bindings from a source file.
 * Returns a Map from local binding name to its ImportBinding.
 *
 * `import { Button } from './button'`         → Map { 'Button'   => { importedName: 'Button',   specifier: './button' } }
 * `import { Button as MyBtn } from './button'` → Map { 'MyBtn'   => { importedName: 'Button',   specifier: './button' } }
 * `import { Btn as Button } from './button'`   → Map { 'Button'  => { importedName: 'Btn',      specifier: './button' } }
 *
 * Default imports and namespace imports (`* as X`) are ignored — only named
 * bindings that could correspond to component identifiers in JSX are collected.
 */
export function extractImportSpecifiers(source: ts.SourceFile): Map<string, ImportBinding> {
  const result = new Map<string, ImportBinding>()

  walkEach(source, (node) => {
    if (!ts.isImportDeclaration(node)) return
    const moduleSpecifier = node.moduleSpecifier
    if (!ts.isStringLiteral(moduleSpecifier)) return
    const specifier = moduleSpecifier.text

    const namedBindings = node.importClause?.namedBindings
    if (!namedBindings || !ts.isNamedImports(namedBindings)) return

    iterate.forEach(namedBindings.elements, (element) => {
      const { isTypeOnly, name, propertyName } = element
      if (isTypeOnly) return

      const { text: localName } = name
      // propertyName is present only when aliased: `import { Foo as Bar }` → propertyName = Foo
      const importedName = propertyName?.text ?? localName
      result.set(localName, { importedName, specifier })
    })
  })

  return result
}
