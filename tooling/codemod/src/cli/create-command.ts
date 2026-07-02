import type { Command, CommandOptions, CommandRunner, Summary } from '../types/index.js'
import { buildProject } from './build-project.js'
import { printUsage } from './usage.js'

export function createCommand<T extends CommandOptions, S extends Summary>(
  command: Command<T, S>,
): CommandRunner {
  return (argv) => {
    const options = command.parse(argv)

    if (options.help) {
      printUsage()
      process.exit(0)
    }

    const project = buildProject(options.files, options.tsconfig)
    const result = command.execute(project, options)

    if (!options.isDryRun) {
      project.saveSync()
    }

    console.log(result.message)
  }
}
