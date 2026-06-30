import { createCommand } from '../cli/create-command.js'
import { parseMigrateOptions } from '../cli/parse-options.js'
import { migrate } from '../transforms/migrate.js'

export const runMigrate = createCommand({
  parse: parseMigrateOptions,
  execute: migrate,
})
