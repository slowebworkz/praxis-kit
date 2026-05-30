/**
 * Regression gate for CI. Checks:
 *   - Architecture violations must be zero
 *   - Public API export count must not grow unexpectedly (warns only)
 *
 * Bundle size regression is already gated by packages/tree-shaking-tests/scripts/gzip.ts.
 * Complexity growth is reported but not gated (informational).
 *
 * Exits 1 if hard gates fail; exits 0 with warnings for soft gates.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReadonlyDeep } from 'type-fest'
import type { Snapshot } from './types.ts'

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

const prevSnapshotPath = join(pkg, '../snapshots/metrics.previous.json')
let previous: ReadonlyDeep<Snapshot> | null = null
try {
  previous = JSON.parse(await readFile(prevSnapshotPath, 'utf8')) as ReadonlyDeep<Snapshot>
} catch {
  // No previous snapshot — first run, save current as previous
  await writeFile(prevSnapshotPath, JSON.stringify(current, null, 2) + '\n')
  console.log('✓ public API: baseline recorded (first run)')
}

if (previous) {
  for (const name in current.architecture.exports) {
    const curr = current.architecture.exports[name]!
    const prev = previous.architecture.exports[name]
    if (!prev) continue
    const prevTotal = prev.values + prev.types
    const currTotal = curr.values + curr.types
    if (currTotal > prevTotal) {
      console.warn(
        `  ⚠ public API: ${name} grew by ${currTotal - prevTotal} exports (${prevTotal} → ${currTotal})`,
      )
    }
  }
  console.log('✓ public API: checked against previous snapshot')
}

// ── Result ────────────────────────────────────────────────────────────────────

if (failed) {
  process.exit(1)
} else {
  console.log('✓ all hard gates passed')
}
