export interface Summary {
  filesModified: number
  message: string
}

export interface RenameSummary extends Summary {
  totalRenames: number
}

export interface PathSummary extends Summary {
  totalRewrites: number
}

export interface MigrateSummary extends Summary {
  renames: RenameSummary
  paths: PathSummary
}
