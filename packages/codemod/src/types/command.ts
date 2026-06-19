import type { Project } from 'ts-morph'
import type { CommandOptions } from './command-options.js'
import type { Summary } from './summary.js'

export interface Command<T extends CommandOptions, S extends Summary = Summary> {
  parse(argv: string[]): T
  execute: (project: Project, options: T) => S
}

export type CommandRunner = (argv: string[]) => void

export type ExecuteFn<T extends CommandOptions, S extends Summary = Summary> = (
  project: Project,
  options: T,
) => S
