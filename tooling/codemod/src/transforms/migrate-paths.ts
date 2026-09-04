import { Node, SyntaxKind } from 'ts-morph'
import type { CallExpression, ExportDeclaration, ImportDeclaration, Project } from 'ts-morph'
import type { TransformOptions, PathSummary } from '../types/index.js'
import { dryRunSuffix } from '../utils.js'
import { resolveReplacement } from './resolve-replacement.js'
import { logRewrite } from './utils.js'

function rewriteModuleSpecifier(
  decl: ImportDeclaration | ExportDeclaration,
  options: TransformOptions,
  filePath: string,
): number {
  const specifier = decl.getModuleSpecifierValue()
  if (specifier === undefined) return 0
  const replacement = resolveReplacement(specifier)
  if (!replacement) return 0
  if (!options.isDryRun) decl.setModuleSpecifier(replacement)
  logRewrite(options.isVerbose, options.isDryRun, `${filePath}: '${specifier}' → '${replacement}'`)
  return 1
}

function rewriteCallExpression(
  call: CallExpression,
  options: TransformOptions,
  filePath: string,
): number {
  const expr = call.getExpression()
  const isRequire = Node.isIdentifier(expr) && expr.getText() === 'require'
  const isDynamic = expr.getKind() === SyntaxKind.ImportKeyword
  if (!isRequire && !isDynamic) return 0

  const args = call.getArguments()
  if (args.length !== 1) return 0
  const arg = args[0]
  if (!Node.isStringLiteral(arg)) return 0

  const specifier = arg.getLiteralValue()
  const replacement = resolveReplacement(specifier)
  if (!replacement) return 0
  if (!options.isDryRun) arg.setLiteralValue(replacement)
  const callKind = isRequire ? 'require' : 'import'
  logRewrite(
    options.isVerbose,
    options.isDryRun,
    `${filePath}: ${callKind}('${specifier}') → ${callKind}('${replacement}')`,
  )
  return 1
}

export function migratePathsInProject(project: Project, options: TransformOptions): PathSummary {
  let totalRewrites = 0
  let filesModified = 0

  for (const sourceFile of project.getSourceFiles()) {
    let fileRewrites = 0
    const filePath = sourceFile.getFilePath()

    for (const decl of [
      ...sourceFile.getImportDeclarations(),
      ...sourceFile.getExportDeclarations(),
    ]) {
      fileRewrites += rewriteModuleSpecifier(decl, options, filePath)
    }

    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      fileRewrites += rewriteCallExpression(call, options, filePath)
    }

    if (fileRewrites > 0) {
      totalRewrites += fileRewrites
      filesModified++
    }
  }

  return {
    totalRewrites,
    filesModified,
    message: `Done: ${totalRewrites} path rewrite(s) across ${filesModified} file(s)${dryRunSuffix(options.isDryRun)}.`,
  }
}
