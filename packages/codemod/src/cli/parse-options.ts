import { parseArgs } from 'node:util'
import type { ParseArgsConfig } from 'node:util'
import type { CommandOptions, RenameLikeOptions } from '../types/index.js'
import { ALL_SOURCE_GLOB, TS_ONLY_GLOB } from './constants.js'
import { renameOptions, sharedOptions, tsconfigOption } from './options.js'

// ─── Interfaces for typed parseArgs values ────────────────────────────────────

interface BaseValues {
  files: string
  tsconfig?: string
  'dry-run': boolean
  verbose: boolean
  help: boolean
}

interface RenameValues extends BaseValues {
  from: string
  to: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseOptions<T>(argv: string[], options: ParseArgsConfig['options']): T {
  return parseArgs({ args: argv, options, strict: true }).values as T
}

function buildCommandOptions(values: BaseValues): CommandOptions {
  return {
    files: values.files,
    // exactOptionalPropertyTypes: string | undefined is not assignable to tsconfig?: string
    ...(values.tsconfig !== undefined && { tsconfig: values.tsconfig }),
    isDryRun: values['dry-run'],
    isVerbose: values.verbose,
    help: values.help,
  }
}

function parseBaseOptions(argv: string[], defaultGlob: string): CommandOptions {
  const values = parseOptions<BaseValues>(argv, {
    files: { type: 'string', default: defaultGlob },
    ...sharedOptions,
  })
  return buildCommandOptions(values)
}

function parseRenameLikeOptions(argv: string[], defaultGlob: string): RenameLikeOptions {
  const values = parseOptions<RenameValues>(argv, {
    ...renameOptions,
    files: { type: 'string', default: defaultGlob },
    ...tsconfigOption,
    ...sharedOptions,
  })
  return { ...buildCommandOptions(values), from: values.from, to: values.to }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const parseMigrateOptions = (argv: string[]): RenameLikeOptions =>
  parseRenameLikeOptions(argv, ALL_SOURCE_GLOB)

export const parseRenameOptions = (argv: string[]): RenameLikeOptions =>
  parseRenameLikeOptions(argv, TS_ONLY_GLOB)

export const parseMigratePathsOptions = (argv: string[]): CommandOptions =>
  parseBaseOptions(argv, ALL_SOURCE_GLOB)
