import { createCommand } from '../cli/create-command.js'
import { parseRenameOptions } from '../cli/parse-options.js'
import { renameInProject } from '../transforms/rename.js'

export const runRename = createCommand({
  parse: parseRenameOptions,
  execute: renameInProject,
})
