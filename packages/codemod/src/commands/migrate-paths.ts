import { createCommand } from '../cli/create-command.js'
import { parseMigratePathsOptions } from '../cli/parse-options.js'
import { migratePathsInProject } from '../transforms/migrate-paths.js'

export const runMigratePaths = createCommand({
  parse: parseMigratePathsOptions,
  execute: migratePathsInProject,
})
