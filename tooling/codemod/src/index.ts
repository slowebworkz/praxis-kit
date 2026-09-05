import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { printUsage } from './cli/usage.js'
import { runMigrate } from './commands/migrate.js'
import { runMigratePaths } from './commands/migrate-paths.js'
import { runRename } from './commands/rename.js'

function main(): void {
  const [, , command, ...rest] = process.argv

  if (!command || command === '--help' || command === '-h') {
    printUsage()
    process.exit(0)
  }

  switch (command) {
    case 'migrate':
      return runMigrate(rest)
    case 'rename':
      return runRename(rest)
    case 'migrate-paths':
      return runMigratePaths(rest)
    default:
      console.error(`Unknown command: ${command}\n`)
      printUsage()
      process.exit(1)
  }
}

// `process.argv[1]` is the path as invoked — when installed, `bin` entries are a symlink
// (`node_modules/.bin/praxis-codemod -> ../praxis-kit/dist/codemod/index.js`), and Node leaves
// that path un-resolved on argv while `import.meta.url` reflects the module's real, symlink-
// resolved location. Comparing them directly (as a naive "is this the entry point" check usually
// does) matches when run via `node dist/index.js` directly but silently fails — `main()` never
// runs, no error, no output — through the exact symlink path every real install invokes it by.
// `realpathSync` resolves the symlink on both sides before comparing.
const invokedPath = process.argv[1] ? realpathSync(process.argv[1]) : undefined
if (invokedPath === fileURLToPath(import.meta.url)) {
  main()
}
