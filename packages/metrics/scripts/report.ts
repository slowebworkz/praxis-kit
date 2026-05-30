/**
 * Prints a formatted summary of the current metrics snapshot.
 * Run after `pnpm collect`, or use `pnpm metrics` to do both in one step.
 */
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkg = dirname(fileURLToPath(import.meta.url))
const snapshotPath = join(pkg, '../snapshots/metrics.json')

type Snapshot = {
  generated: string
  bundles: Record<string, number>
  architecture: {
    status: string
    violations: number
    exports: Record<string, { values: number; types: number }>
  }
  complexity: Record<string, { files: number; functions: number; loc: number }>
}

const snap = JSON.parse(await readFile(snapshotPath, 'utf8')) as Snapshot

const W = 72
const hr = '─'.repeat(W)
const generated = new Date(snap.generated).toLocaleString()

console.log(`\nPraxis UI — Metrics Dashboard  (${generated})`)

// ── Bundles ───────────────────────────────────────────────────────────────────

console.log(`\n${'BUNDLES'.padEnd(30)}${'gzip'.padStart(8)}`)
console.log(hr)
for (const [scenario, gzip] of Object.entries(snap.bundles).sort((a, b) => b[1] - a[1])) {
  const bar = '█'.repeat(Math.round((gzip / 8500) * 20))
  console.log(`  ${scenario.padEnd(28)}${String(gzip).padStart(7)}B  ${bar}`)
}

// ── Architecture ──────────────────────────────────────────────────────────────

const { status, violations, exports: exp } = snap.architecture
const statusLabel = violations === 0 ? `✓ ${status}` : `✗ ${violations} violation(s)`

console.log(`\n${'ARCHITECTURE'.padEnd(30)}`)
console.log(hr)
console.log(`  Dependency graph          ${statusLabel}`)
console.log(`\n  Public API surface (values + types):`)
for (const [name, { values, types }] of Object.entries(exp).sort((a, b) =>
  a[0].localeCompare(b[0]),
)) {
  const total = values + types
  console.log(
    `    ${name.replace('@praxis-ui/', '').padEnd(20)}  ${String(total).padStart(4)}  (${values}v + ${types}t)`,
  )
}

// ── Complexity ────────────────────────────────────────────────────────────────

console.log(
  `\n${'COMPLEXITY'.padEnd(22)}${'files'.padStart(8)}${'funcs'.padStart(8)}${'loc'.padStart(8)}`,
)
console.log(hr)

let totalFiles = 0
let totalFunctions = 0
let totalLoc = 0

for (const [key, { files, functions, loc }] of Object.entries(snap.complexity)) {
  const label = key.replace('packages/', '').replace('lib/', '')
  console.log(
    `  ${label.padEnd(20)}${String(files).padStart(8)}${String(functions).padStart(8)}${String(loc).padStart(8)}`,
  )
  totalFiles += files
  totalFunctions += functions
  totalLoc += loc
}

console.log(hr)
console.log(
  `  ${'total'.padEnd(20)}${String(totalFiles).padStart(8)}${String(totalFunctions).padStart(8)}${String(totalLoc).padStart(8)}`,
)

console.log('')
