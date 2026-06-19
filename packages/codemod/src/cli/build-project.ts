import { Project } from 'ts-morph'

export function buildProject(glob: string, tsconfig?: string): Project {
  const project = tsconfig
    ? new Project({ tsConfigFilePath: tsconfig })
    : new Project({ skipAddingFilesFromTsConfig: true })
  if (!tsconfig) project.addSourceFilesAtPaths(glob)
  return project
}
