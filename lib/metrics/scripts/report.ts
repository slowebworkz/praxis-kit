/**
 * Prints a formatted summary of the current metrics snapshot.
 * Run after `pnpm collect`, or use `pnpm metrics` to do both in one step.
 */
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReadonlyDeep } from 'type-fest'
import type { Snapshot } from './types.ts'

const pkg = dirname(fileURLToPath(import.meta.url))
const snapshotPath = join(pkg, '../snapshots/metrics.json')

const snap = JSON.parse(await readFile(snapshotPath, 'utf8')) as ReadonlyDeep<Snapshot>

const W = 72
const hr = '─'.repeat(W)
const generated = new Date(snap.generated).toLocaleString()

const lines: string[] = []
lines.push(`\nPraxis Kit — Metrics Dashboard  (${generated})`)

// ── Bundles ───────────────────────────────────────────────────────────────────
// collect.ts writes bundles gzip-descending; JSON.parse preserves insertion
// order for string keys (ES2015+), so for...in reflects that order here.

lines.push(`\n${'BUNDLES'.padEnd(30)}${'gzip'.padStart(8)}`)
lines.push(hr)
for (const scenario in snap.bundles) {
  const gzip = snap.bundles[scenario]!
  const bar = '█'.repeat(Math.round((gzip / 8500) * 20))
  lines.push(`  ${scenario.padEnd(28)}${String(gzip).padStart(7)}B  ${bar}`)
}

// ── Architecture ──────────────────────────────────────────────────────────────
// collect.ts writes exports alpha-sorted; JSON.parse preserves insertion
// order for string keys (ES2015+), so for...in reflects that order here.

const { status, violations, exports: exp } = snap.architecture
const statusLabel = violations === 0 ? `✓ ${status}` : `✗ ${violations} violation(s)`

lines.push(`\n${'ARCHITECTURE'.padEnd(30)}`)
lines.push(hr)
lines.push(`  Dependency graph          ${statusLabel}`)
lines.push(`\n  Public API surface (values + types):`)
for (const name in exp) {
  const { values, types } = exp[name]!
  const total = values + types
  lines.push(
    `    ${name.replace('@praxis-kit/', '').padEnd(20)}  ${String(total).padStart(4)}  (${values}v + ${types}t)`,
  )
}

// ── Complexity ────────────────────────────────────────────────────────────────

lines.push(
  `\n${'COMPLEXITY'.padEnd(22)}${'files'.padStart(8)}${'funcs'.padStart(8)}${'loc'.padStart(8)}`,
)
lines.push(hr)

let totalFiles = 0
let totalFunctions = 0
let totalLoc = 0

for (const key in snap.complexity) {
  const { files, functions, loc } = snap.complexity[key]!
  const label = key.replace('packages/', '').replace('lib/', '')
  lines.push(
    `  ${label.padEnd(20)}${String(files).padStart(8)}${String(functions).padStart(8)}${String(loc).padStart(8)}`,
  )
  totalFiles += files
  totalFunctions += functions
  totalLoc += loc
}

lines.push(hr)
lines.push(
  `  ${'total'.padEnd(20)}${String(totalFiles).padStart(8)}${String(totalFunctions).padStart(8)}${String(totalLoc).padStart(8)}`,
)
lines.push('')

console.log(lines.join('\n'))
