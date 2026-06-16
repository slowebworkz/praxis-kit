import { fileURLToPath } from 'node:url'
import { Node, Project, SyntaxKind } from 'ts-morph'
import { parseArgs } from 'node:util'

// Package names that don't follow the default @praxis-kit/<name> → praxis-kit/<name> pattern.
const SPECIAL_CASES: Readonly<Record<string, string>> = {
  '@praxis-kit/eslint-plugin': 'praxis-kit/eslint',
}

export function resolveReplacement(specifier: string): string | undefined {
  if (!specifier.startsWith('@praxis-kit/')) return undefined
  return SPECIAL_CASES[specifier] ?? specifier.replace('@praxis-kit/', 'praxis-kit/')
}

// Matches both @praxis-kit/* and praxis-kit/* so rename works before or after path migration.
const PRAXIS_PACKAGE = /^(?:@praxis-kit|praxis-kit)\//

function printUsage(): void {
  console.error(
    `
Usage: praxis-codemod <command> [options]

Commands:
  migrate         Rewrite import paths and rename the factory function in one pass (recommended)
  rename          Rename a factory function across your codebase (ESM named imports only)
  migrate-paths   Rewrite @praxis-kit/* import paths to praxis-kit/*

  Notes:
  - Namespace imports (import * as X from '@praxis-kit/react') are not renamed.
    Migrate those manually after running the codemod.
  - CJS destructuring (const { fn } = require(...)) is not renamed.
  - Re-exports (export { fn } from '...') are renamed by the rename command.

Options for migrate / rename:
  --from <name>     Factory function name to rename (default: createPolymorphicComponent)
  --to <name>       New factory function name (default: createContractComponent)
  --tsconfig <path> Path to tsconfig.json for richer symbol resolution (default: none)

Options for migrate / migrate-paths:
  --files <glob>    Glob pattern for files to transform
                    (default for rename: **/*.{ts,tsx})
                    (default for migrate / migrate-paths: **/*.{ts,tsx,cts,mts,js,jsx,cjs,mjs})

Shared options:
  --dry-run         Preview changes without writing to disk (prints summary only)
  --verbose         Print each individual change
  --help            Show this help message
`.trim(),
  )
}

// ─── Path rewriting ───────────────────────────────────────────────────────────

export function migratePathsInProject(
  project: Project,
  options: { isDryRun: boolean; isVerbose: boolean },
): { totalRewrites: number; filesModified: number } {
  const { isDryRun, isVerbose } = options
  let totalRewrites = 0
  let filesModified = 0

  for (const sourceFile of project.getSourceFiles()) {
    let fileRewrites = 0
    const prefix = isDryRun ? '[dry-run] ' : ''
    const filePath = sourceFile.getFilePath()

    // ESM: import / export declarations
    for (const decl of [
      ...sourceFile.getImportDeclarations(),
      ...sourceFile.getExportDeclarations(),
    ]) {
      const specifier = decl.getModuleSpecifierValue()
      if (specifier === undefined) continue
      const replacement = resolveReplacement(specifier)
      if (!replacement) continue
      if (!isDryRun) decl.setModuleSpecifier(replacement)
      fileRewrites++
      if (isVerbose) console.log(`${prefix}${filePath}: '${specifier}' → '${replacement}'`)
    }

    // CJS require() and dynamic import() — single traversal
    for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const expr = call.getExpression()
      const isRequire = Node.isIdentifier(expr) && expr.getText() === 'require'
      const isDynamic = expr.getKind() === SyntaxKind.ImportKeyword
      if (!isRequire && !isDynamic) continue

      const args = call.getArguments()
      if (args.length !== 1) continue
      const arg = args[0]
      if (!Node.isStringLiteral(arg)) continue

      const specifier = arg.getLiteralValue()
      const replacement = resolveReplacement(specifier)
      if (!replacement) continue
      if (!isDryRun) arg.setLiteralValue(replacement)
      fileRewrites++
      const callKind = isRequire ? 'require' : 'import'
      if (isVerbose)
        console.log(
          `${prefix}${filePath}: ${callKind}('${specifier}') → ${callKind}('${replacement}')`,
        )
    }

    if (fileRewrites > 0) {
      totalRewrites += fileRewrites
      filesModified++
    }
  }

  return { totalRewrites, filesModified }
}

// ─── Symbol rename ────────────────────────────────────────────────────────────

export function renameInProject(
  project: Project,
  options: { fromName: string; toName: string; isDryRun: boolean; isVerbose: boolean },
): { totalRenames: number; filesModified: number } {
  const { fromName, toName, isDryRun, isVerbose } = options
  let totalRenames = 0
  let filesModified = 0

  for (const sourceFile of project.getSourceFiles()) {
    // Named imports: import { fromName } from 'praxis-kit/...' or '@praxis-kit/...'
    const importTargets = sourceFile
      .getImportDeclarations()
      .filter((d) => PRAXIS_PACKAGE.test(d.getModuleSpecifierValue() ?? ''))
      .flatMap((d) => d.getNamedImports())
      .filter((i) => i.getName() === fromName)

    // Named re-exports: export { fromName } from 'praxis-kit/...'
    const exportTargets = sourceFile
      .getExportDeclarations()
      .filter((d) => PRAXIS_PACKAGE.test(d.getModuleSpecifierValue() ?? ''))
      .flatMap((d) => d.getNamedExports())
      .filter((e) => e.getName() === fromName)

    const count = importTargets.length + exportTargets.length
    if (count === 0) continue

    if (isVerbose)
      console.log(`${isDryRun ? '[dry-run] ' : ''}${sourceFile.getFilePath()}: ${count} rename(s)`)

    if (!isDryRun) {
      for (const namedImport of importTargets) {
        const nameNode = namedImport.getNameNode()
        if (!Node.isIdentifier(nameNode)) continue
        // With an alias, the local binding is the alias — rename() would chase the module symbol
        // (which may not resolve). replaceWithText() is correct for the import clause only.
        if (namedImport.getAliasNode() !== undefined) {
          nameNode.replaceWithText(toName)
        } else {
          nameNode.rename(toName)
        }
      }
      for (const namedExport of exportTargets) {
        const nameNode = namedExport.getNameNode()
        if (!Node.isIdentifier(nameNode)) continue
        if (namedExport.getAliasNode() !== undefined) {
          nameNode.replaceWithText(toName)
        } else {
          nameNode.rename(toName)
        }
      }
    }

    totalRenames += count
    filesModified++
  }

  return { totalRenames, filesModified }
}

// ─── CLI commands ─────────────────────────────────────────────────────────────

function buildProject(glob: string, tsconfig?: string): Project {
  const project = tsconfig
    ? new Project({ tsConfigFilePath: tsconfig })
    : new Project({ skipAddingFilesFromTsConfig: true })
  if (!tsconfig) project.addSourceFilesAtPaths(glob)
  return project
}

function runMigrate(argv: string[]): void {
  const { values } = parseArgs({
    args: argv,
    options: {
      from: { type: 'string', default: 'createPolymorphicComponent' },
      to: { type: 'string', default: 'createContractComponent' },
      files: { type: 'string', default: '**/*.{ts,tsx,cts,mts,js,jsx,cjs,mjs}' },
      tsconfig: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    strict: true,
  })

  if (values.help) {
    printUsage()
    process.exit(0)
  }

  const opts = { isDryRun: values['dry-run']!, isVerbose: values.verbose! }
  const project = buildProject(values.files!, values.tsconfig)

  // Rename first so the rename filter can match @praxis-kit/* before paths are rewritten.
  const renames = renameInProject(project, { fromName: values.from!, toName: values.to!, ...opts })
  const paths = migratePathsInProject(project, opts)

  if (!opts.isDryRun) project.saveSync()

  const dryRunNote = opts.isDryRun ? ' (dry run — no files written)' : ''
  console.log(
    `\nDone: ${renames.totalRenames} rename(s) across ${renames.filesModified} file(s), ` +
      `${paths.totalRewrites} path rewrite(s) across ${paths.filesModified} file(s)${dryRunNote}.`,
  )
}

function runRename(argv: string[]): void {
  const { values } = parseArgs({
    args: argv,
    options: {
      from: { type: 'string', default: 'createPolymorphicComponent' },
      to: { type: 'string', default: 'createContractComponent' },
      files: { type: 'string', default: '**/*.{ts,tsx}' },
      tsconfig: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    strict: true,
  })

  if (values.help) {
    printUsage()
    process.exit(0)
  }

  const opts = { isDryRun: values['dry-run']!, isVerbose: values.verbose! }
  const project = buildProject(values.files!, values.tsconfig)
  const { totalRenames, filesModified } = renameInProject(project, {
    fromName: values.from!,
    toName: values.to!,
    ...opts,
  })

  if (!opts.isDryRun) project.saveSync()

  const dryRunNote = opts.isDryRun ? ' (dry run — no files written)' : ''
  console.log(`\nDone: ${totalRenames} rename(s) across ${filesModified} file(s)${dryRunNote}.`)
}

function runMigratePaths(argv: string[]): void {
  const { values } = parseArgs({
    args: argv,
    options: {
      files: { type: 'string', default: '**/*.{ts,tsx,cts,mts,js,jsx,cjs,mjs}' },
      'dry-run': { type: 'boolean', default: false },
      verbose: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    strict: true,
  })

  if (values.help) {
    printUsage()
    process.exit(0)
  }

  const opts = { isDryRun: values['dry-run']!, isVerbose: values.verbose! }
  const project = buildProject(values.files!)
  const { totalRewrites, filesModified } = migratePathsInProject(project, opts)

  if (!opts.isDryRun) project.saveSync()

  const dryRunNote = opts.isDryRun ? ' (dry run — no files written)' : ''
  console.log(
    `\nDone: ${totalRewrites} path rewrite(s) across ${filesModified} file(s)${dryRunNote}.`,
  )
}

function main(): void {
  const [, , command, ...rest] = process.argv

  if (!command || command === '--help' || command === '-h') {
    printUsage()
    process.exit(0)
  }

  if (command === 'migrate') return runMigrate(rest)
  if (command === 'rename') return runRename(rest)
  if (command === 'migrate-paths') return runMigratePaths(rest)

  console.error(`Unknown command: ${command}\n`)
  printUsage()
  process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
