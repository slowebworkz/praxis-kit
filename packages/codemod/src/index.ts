import { Project, SyntaxKind } from 'ts-morph'
import { parseArgs } from 'node:util'

// Mapping from old scoped package paths to new praxis-kit sub-entries.
// @praxis-kit/eslint-plugin becomes praxis-kit/eslint to match the exports map.
const PATH_MAP: Readonly<Record<string, string>> = {
  '@praxis-kit/react': 'praxis-kit/react',
  '@praxis-kit/react/legacy': 'praxis-kit/react/legacy',
  '@praxis-kit/preact': 'praxis-kit/preact',
  '@praxis-kit/solid': 'praxis-kit/solid',
  '@praxis-kit/svelte': 'praxis-kit/svelte',
  '@praxis-kit/vue': 'praxis-kit/vue',
  '@praxis-kit/lit': 'praxis-kit/lit',
  '@praxis-kit/web': 'praxis-kit/web',
  '@praxis-kit/tailwind': 'praxis-kit/tailwind',
  '@praxis-kit/eslint-plugin': 'praxis-kit/eslint',
  '@praxis-kit/ts-plugin': 'praxis-kit/ts-plugin',
  '@praxis-kit/vite-plugin': 'praxis-kit/vite-plugin',
  '@praxis-kit/codemod': 'praxis-kit/codemod',
}

function printUsage(): void {
  console.error(
    `
Usage: praxis-codemod <command> [options]

Commands:
  rename          Rename a factory function across your codebase
  migrate-paths   Rewrite @praxis-kit/* import paths to praxis-kit/*

Options for rename:
  --from <name>     Factory function name to rename (default: createPolymorphicComponent)
  --to <name>       New factory function name (default: createContractComponent)
  --files <glob>    Glob pattern for files to transform (default: **/*.{ts,tsx})
  --dry-run         Preview changes without writing to disk
  --help            Show this help message

Options for migrate-paths:
  --files <glob>    Glob pattern for files to transform (default: **/*.{ts,tsx})
  --dry-run         Preview changes without writing to disk
  --help            Show this help message
`.trim(),
  )
}

function runRename(argv: string[]): void {
  const { values } = parseArgs({
    args: argv,
    options: {
      from: { type: 'string', default: 'createPolymorphicComponent' },
      to: { type: 'string', default: 'createContractComponent' },
      files: { type: 'string', default: '**/*.{ts,tsx}' },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    strict: true,
  })

  if (values.help) {
    printUsage()
    process.exit(0)
  }

  const fromName = values.from!
  const toName = values.to!
  const isDryRun = values['dry-run']!
  const glob = values.files!

  const project = new Project({ skipAddingFilesFromTsConfig: true })
  project.addSourceFilesFromTsConfig('tsconfig.json')
  project.addSourceFilesAtPaths(glob)

  const sourceFiles = project.getSourceFiles()
  let totalRenames = 0
  let filesModified = 0

  for (const sourceFile of sourceFiles) {
    let fileRenames = 0

    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
    for (const ident of identifiers) {
      if (ident.getText() === fromName) {
        if (!isDryRun) ident.replaceWithText(toName)
        fileRenames++
      }
    }

    if (fileRenames > 0) {
      totalRenames += fileRenames
      filesModified++
      console.log(
        `${isDryRun ? '[dry-run] ' : ''}${sourceFile.getFilePath()}: ${fileRenames} rename(s)`,
      )
      if (!isDryRun) sourceFile.saveSync()
    }
  }

  const dryRunNote = isDryRun ? ' (dry run — no files written)' : ''
  console.log(`\nDone: ${totalRenames} rename(s) across ${filesModified} file(s)${dryRunNote}.`)
}

function runMigratePaths(argv: string[]): void {
  const { values } = parseArgs({
    args: argv,
    options: {
      files: { type: 'string', default: '**/*.{ts,tsx,js,jsx,mjs,mts}' },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    strict: true,
  })

  if (values.help) {
    printUsage()
    process.exit(0)
  }

  const isDryRun = values['dry-run']!
  const glob = values.files!

  const project = new Project({ skipAddingFilesFromTsConfig: true })
  project.addSourceFilesAtPaths(glob)

  const sourceFiles = project.getSourceFiles()
  let totalRewrites = 0
  let filesModified = 0

  for (const sourceFile of sourceFiles) {
    let fileRewrites = 0

    const declarations = [
      ...sourceFile.getImportDeclarations(),
      ...sourceFile.getExportDeclarations(),
    ]

    for (const decl of declarations) {
      const specifier = decl.getModuleSpecifierValue()
      if (specifier === undefined) continue

      const replacement = PATH_MAP[specifier]
      if (!replacement) continue

      if (!isDryRun) decl.setModuleSpecifier(replacement)
      fileRewrites++
      console.log(
        `${isDryRun ? '[dry-run] ' : ''}${sourceFile.getFilePath()}: '${specifier}' → '${replacement}'`,
      )
    }

    if (fileRewrites > 0) {
      totalRewrites += fileRewrites
      filesModified++
      if (!isDryRun) sourceFile.saveSync()
    }
  }

  const dryRunNote = isDryRun ? ' (dry run — no files written)' : ''
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

  if (command === 'rename') return runRename(rest)
  if (command === 'migrate-paths') return runMigratePaths(rest)

  console.error(`Unknown command: ${command}\n`)
  printUsage()
  process.exit(1)
}

main()
