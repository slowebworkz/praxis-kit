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

const totalExports = (pkg: { values: number; types: number }) => pkg.values + pkg.types
const percentGrowth = (previous: number, current: number) => ((current - previous) / previous) * 100

const pkg = dirname(fileURLToPath(import.meta.url))
const snapshotPath = join(pkg, '../snapshots/metrics.json')

let current: ReadonlyDeep<Snapshot>
try {
  current = JSON.parse(await readFile(snapshotPath, 'utf8')) as ReadonlyDeep<Snapshot>
} catch {
  console.log('No snapshot found — run `pnpm collect` first.')
  process.exit(1)
}

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

// ── Public API growth (soft gate — warn only) ─────────────────────────────────
// Baseline is the committed snapshot in git HEAD, so the comparison always
// reflects "what changed since the last commit" rather than a stale one-time file.

// HEAD~1 is the commit before the current one — the state before this PR's
// changes landed. Comparing against HEAD would always show zero diff when
// metrics.json is committed as part of the same commit that triggered CI.
let previous: ReadonlyDeep<Snapshot> | null = null
const gitPath = 'lib/metrics/snapshots/metrics.json'
for (const ref of ['HEAD~1', 'HEAD']) {
  try {
    const raw = execSync(`git show ${ref}:${gitPath}`, { encoding: 'utf8' })
    previous = JSON.parse(raw) as ReadonlyDeep<Snapshot>
    break
  } catch {
    // try next ref
  }
}
if (!previous) {
  console.log('✓ public API: no committed baseline found — skipping growth check')
}

if (previous) {
  for (const name in current.architecture.exports) {
    const curr = current.architecture.exports[name]!
    const prev = previous.architecture.exports[name]
    if (!prev) {
      console.warn(`  ⚠ public API: new package ${name} introduced (${totalExports(curr)} exports)`)
      continue
    }
    const prevTotal = totalExports(prev)
    const currTotal = totalExports(curr)
    if (currTotal > prevTotal) {
      console.warn(
        `  ⚠ public API: ${name} grew by ${currTotal - prevTotal} exports (${prevTotal} → ${currTotal})`,
      )
    }
  }
  for (const name in previous.architecture.exports) {
    if (!(name in current.architecture.exports)) {
      console.warn(`  ⚠ public API: ${name} removed`)
    }
  }
  console.log('✓ public API: checked against committed baseline')
}

// ── Complexity growth (soft gate — warn only) ─────────────────────────────────

if (previous) {
  for (const key in current.complexity) {
    const curr = current.complexity[key]!
    const prev = previous.complexity[key]
    if (!prev) continue
    if (prev.loc === 0) continue
    const pct = percentGrowth(prev.loc, curr.loc)
    if (pct >= 20) {
      console.warn(`  ⚠ complexity: ${key} LOC grew ${pct.toFixed(0)}% (${prev.loc} → ${curr.loc})`)
    }
  }
}

// ── Result ────────────────────────────────────────────────────────────────────

if (failed) {
  process.exit(1)
} else {
  console.log('✓ all hard gates passed')
}
