import { Node } from 'ts-morph'
import type { Project } from 'ts-morph'
import type { RenameOptions, RenameSummary } from '../types/index.js'
import { dryRunSuffix } from '../utils.js'
import { PRAXIS_PACKAGE } from './constants.js'
import { logRewrite } from './utils.js'

// Only touches a name imported/re-exported from a @praxis-kit or praxis-kit specifier — an
// identically-named symbol from elsewhere in the same file is untouched (the PRAXIS_PACKAGE
// filter runs before either walk below even sees the declaration).
//
// Two different renames happen depending on aliasing, and they have different reach:
//   - unaliased (`import { createPolymorphicComponent } from ...`): `nameNode.rename()` is a real
//     ts-morph/language-service identifier rename, so it also updates every other reference to
//     that binding within the project's scope — a bare `const fn = createPolymorphicComponent`,
//     a `.bind(...)` call off it, JSX usage, all of it — not just the import/export line.
//   - aliased (`import { createPolymorphicComponent as poly } from ...`): the local binding the
//     rest of the file actually uses is `poly`, not the original name, so `rename()` would chase
//     the wrong symbol. `replaceWithText()` only rewrites the name at the specifier itself; `poly`
//     and its call sites are deliberately left alone.
export function renameInProject(project: Project, options: RenameOptions): RenameSummary {
  const { from, to, isDryRun, isVerbose } = options
  let totalRenames = 0
  let filesModified = 0

  for (const sourceFile of project.getSourceFiles()) {
    const imports = sourceFile
      .getImportDeclarations()
      .filter((d) => PRAXIS_PACKAGE.test(d.getModuleSpecifierValue() ?? ''))
    const exports = sourceFile
      .getExportDeclarations()
      .filter((d) => PRAXIS_PACKAGE.test(d.getModuleSpecifierValue() ?? ''))

    const matchingImports = imports
      .flatMap((d) => d.getNamedImports())
      .filter((i) => i.getName() === from)
    const matchingExports = exports
      .flatMap((d) => d.getNamedExports())
      .filter((e) => e.getName() === from)
    const count = matchingImports.length + matchingExports.length
    if (count === 0) continue

    logRewrite(isVerbose, isDryRun, `${sourceFile.getFilePath()}: ${count} rename(s)`)

    if (!isDryRun) {
      for (const i of matchingImports) {
        const nameNode = i.getNameNode()
        if (!Node.isIdentifier(nameNode)) continue
        // With an alias, the local binding is the alias — rename() would chase the module symbol.
        if (i.getAliasNode() !== undefined) nameNode.replaceWithText(to)
        else nameNode.rename(to)
      }
      for (const e of matchingExports) {
        const nameNode = e.getNameNode()
        if (!Node.isIdentifier(nameNode)) continue
        if (e.getAliasNode() !== undefined) nameNode.replaceWithText(to)
        else nameNode.rename(to)
      }
    }

    totalRenames += count
    filesModified++
  }

  return {
    totalRenames,
    filesModified,
    message: `Done: ${totalRenames} rename(s) across ${filesModified} file(s)${dryRunSuffix(isDryRun)}.`,
  }
}
