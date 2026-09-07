// Renders a plain-text terminal dashboard from snapshots/metrics.json. Pure formatting — reads
// only the already-collected snapshot, no .repo-state/gzip.json dependency of its own. Relies on
// JSON key insertion order (the order collect.ts wrote things in), not re-sorted here.
//
// Run: pnpm --filter @praxis-kit/metrics report

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { iterate } from '@praxis-kit/foundation'
import type { ReadonlyDeep } from 'type-fest'
import type { Snapshot } from './types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_PATH = join(__dirname, '..', 'snapshots', 'metrics.json')

const W = 72
const RULE = '─'.repeat(W)

function section(title: string): void {
  console.log(`\n${title}`)
  console.log(RULE)
}

// Bar length is scaled against a fixed reference size, not the current max in the data — so
// this repo's much smaller package/* scenario sizes render as tiny/near-zero bars next to the
// larger source/* ones. Cosmetic only; assert.ts doesn't gate on it.
const BAR_REFERENCE_BYTES = 8500
const BAR_WIDTH = 20

function renderBundles(bundles: ReadonlyDeep<Snapshot['bundles']>): void {
  section('BUNDLES (gzip)')
  iterate.forEachEntry(bundles, (scenario, gzip) => {
    const bar = '█'.repeat(Math.round((gzip / BAR_REFERENCE_BYTES) * BAR_WIDTH))
    console.log(`${scenario.padEnd(28)} ${String(gzip).padStart(7)}  ${bar}`)
  })
}

function renderArchitecture(architecture: ReadonlyDeep<Snapshot['architecture']>): void {
  section('ARCHITECTURE')
  console.log(
    architecture.violations > 0
      ? `✗ ${architecture.violations} violation(s)`
      : `✓ ${architecture.status}`,
  )
  iterate.forEachEntry(architecture.exports, (name, counts) => {
    const total = counts.values + counts.types
    console.log(`  ${name.padEnd(30)} ${total} (${counts.values}v + ${counts.types}t)`)
  })
}

function renderComplexity(complexity: ReadonlyDeep<Snapshot['complexity']>): void {
  section('COMPLEXITY')
  console.log(
    `${'package'.padEnd(24)} ${'files'.padStart(6)} ${'functions'.padStart(10)} ${'loc'.padStart(8)}`,
  )

  const total = { files: 0, functions: 0, loc: 0 }
  iterate.forEachEntry(complexity, (key, metrics) => {
    total.files += metrics.files
    total.functions += metrics.functions
    total.loc += metrics.loc
    console.log(
      `${key.padEnd(24)} ${String(metrics.files).padStart(6)} ${String(metrics.functions).padStart(10)} ${String(metrics.loc).padStart(8)}`,
    )
  })
  console.log(RULE)
  console.log(
    `${'total'.padEnd(24)} ${String(total.files).padStart(6)} ${String(total.functions).padStart(10)} ${String(total.loc).padStart(8)}`,
  )
}

function main(): void {
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8')) as ReadonlyDeep<Snapshot>

  renderBundles(snapshot.bundles)
  renderArchitecture(snapshot.architecture)
  renderComplexity(snapshot.complexity)
  console.log()
}

main()
