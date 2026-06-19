import type { Project } from 'ts-morph'
import type { RenameLikeOptions, MigrateSummary } from '../types/index.js'
import { dryRunSuffix } from '../utils.js'
import { migratePathsInProject } from './migrate-paths.js'
import { renameInProject } from './rename.js'

// Rename before paths so the filter matches @praxis-kit/* specifiers before they are rewritten.
export function migrate(project: Project, options: RenameLikeOptions): MigrateSummary {
  const renames = renameInProject(project, options)
  const paths = migratePathsInProject(project, options)
  return {
    renames,
    paths,
    filesModified: renames.filesModified + paths.filesModified,
    message:
      `Done: ${renames.totalRenames} rename(s) across ${renames.filesModified} file(s), ` +
      `${paths.totalRewrites} path rewrite(s) across ${paths.filesModified} file(s)${dryRunSuffix(options.isDryRun)}.`,
  }
}
