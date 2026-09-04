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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
