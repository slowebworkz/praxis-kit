/**
 * Regression gate for CI. Checks:
 *   - Architecture violations must be zero
 *   - Public API export count must not grow unexpectedly (warns only)
 *
 * Bundle size regression is already gated by lib/tree-shaking-tests/scripts/gzip.ts.
 * Complexity growth is reported but not gated (informational).
 *
 * Exits 1 if hard gates fail; exits 0 with warnings for soft gates.
 */
import { execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReadonlyDeep } from 'type-fest'
import type { Snapshot } from './types.ts'
import { iterate } from '@praxis-kit/primitive'

const totalExports = (pkg: { values: number; types: number }) => pkg.values + pkg.types
const percentGrowth = (previous: number, current: number) =>
  previous === 0 ? 0 : ((current - previous) / previous) * 100

const pkg = dirname(fileURLToPath(import.meta.url))
const snapshotPath = join(pkg, '../snapshots/metrics.json')

function parseSnapshot(json: string): ReadonlyDeep<Snapshot> {
  return JSON.parse(json) as ReadonlyDeep<Snapshot>
}

let current: ReadonlyDeep<Snapshot>
try {
  current = parseSnapshot(await readFile(snapshotPath, 'utf8'))
} catch {
  console.log('No snapshot found — run `pnpm collect` first.')
  process.exit(1)
}

const warnings: string[] = []
let failed = false

// ── Architecture violations (hard gate) ───────────────────────────────────────

if (current.architecture.violations > 0) {
  console.error(
    `✗ architecture: ${current.architecture.violations} dependency violation(s) detected`,
  )
  failed = true
} else {
  console.log('✓ architecture: dependency graph clean')
}

// ── Public API + complexity growth (soft gate — warn only) ────────────────────
// Prefer the merge base of the current branch and origin/main so the comparison
// is stable against squash merges, rebases, and shallow clones. Falls back to
// HEAD~1 (previous commit) and then HEAD as a last resort.

const gitPath = 'lib/metrics/snapshots/metrics.json'
const refs = [
  ...(() => {
    try {
      return [execSync('git merge-base HEAD origin/main', { encoding: 'utf8' }).trim()]
    } catch {
      return []
    }
  })(),
  'HEAD~1',
  'HEAD',
]

function loadCommittedSnapshot(ref: string): ReadonlyDeep<Snapshot> | null {
  try {
    const raw = execSync(`git show ${ref}:${gitPath}`, { encoding: 'utf8' })
    return parseSnapshot(raw)
  } catch {
    return null
  }
}

const previous = iterate.find(refs, loadCommittedSnapshot)

if (!previous) {
  console.log('✓ public API: no committed baseline found — skipping growth check')
} else {
  iterate.forEachEntry(current.architecture.exports, (name, curr) => {
    const prev = previous.architecture.exports[name]
    if (!prev) {
      warnings.push(
        `  ⚠ public API: new package ${name} introduced (${curr.values} values / ${curr.types} types)`,
      )
      return
    }
    const prevTotal = totalExports(prev)
    const currTotal = totalExports(curr)
    if (currTotal > prevTotal) {
      warnings.push(
        `  ⚠ public API: ${name} grew by ${currTotal - prevTotal} exports` +
          ` (${prevTotal} → ${currTotal}: ${curr.values} values / ${curr.types} types)`,
      )
    }
  })

  iterate.forEachKey(previous.architecture.exports, (name) => {
    if (!(name in current.architecture.exports)) {
      warnings.push(`  ⚠ public API: ${name} removed`)
    }
  })

  console.log('✓ public API: checked against committed baseline')

  iterate.forEachEntry(current.complexity, (key, curr) => {
    const prev = previous.complexity[key]
    if (!prev || prev.loc === 0) return
    const pct = percentGrowth(prev.loc, curr.loc)
    if (pct >= 20 && curr.loc - prev.loc >= 20) {
      warnings.push(
        `  ⚠ complexity: ${key} LOC grew ${pct.toFixed(0)}% (${prev.loc} → ${curr.loc})`,
      )
    }
  })
}

// ── Result ────────────────────────────────────────────────────────────────────

if (warnings.length > 0) {
  console.warn('\nWarnings:')
  iterate.forEach(warnings, (w) => console.warn(w))
  console.warn('')
}

if (failed) {
  process.exitCode = 1
} else {
  console.log('✓ all hard gates passed')
}
