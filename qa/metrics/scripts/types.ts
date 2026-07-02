// ── Output ────────────────────────────────────────────────────────────────────

export type Snapshot = {
  generated: string
  bundles: Record<string, number>
  architecture: {
    status: string
    violations: number
    exports: Record<string, { values: number; types: number }>
  }
  complexity: Record<string, { files: number; functions: number; loc: number }>
}

export type PackageMetrics = { files: number; functions: number; loc: number }

// ── Input (JSON source shapes) ────────────────────────────────────────────────

export type GzipSnapshot = Record<string, { gzip: number }>

export type DepGraph = {
  status: string
  violations: unknown[]
  packageImports: Record<string, string[]>
}

// Index signature must include `| string` to be compatible with `generated: string`.
export type ExportsFile = {
  generated: string
  [pkg: string]: { values?: string[]; types?: string[] } | string
}
