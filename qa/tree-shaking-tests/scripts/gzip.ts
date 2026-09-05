/**
 * Measures the gzip-compressed size of each scenario bundle and compares against
 * snapshots/gzip.json.
 *
 * Two modes, not one that silently guesses:
 *   - `node scripts/gzip.ts` (what `pnpm test` runs) — CHECK mode. Fails if the snapshot is
 *     missing entirely, if a built scenario has no baseline, if a baseline references a scenario
 *     that no longer exists (stale entry — deleted `scenarios/foo` left `"foo"` behind), or if a
 *     scenario exceeds its baseline by more than THRESHOLD_PERCENT. Never writes the snapshot.
 *   - `node scripts/gzip.ts --update` (`pnpm gzip:update`) — UPDATE mode. Replaces the snapshot
 *     with exactly the currently-built scenario set (pruning stale entries as a side effect) and
 *     always exits 0.
 * `pnpm test` must never mutate tracked repository state on an ordinary run — baseline changes are
 * something a person decides and reviews, not something a test run does as a side effect.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import type { StringMap } from '@praxis-kit/primitive'

const pkg = dirname(fileURLToPath(import.meta.url))
const distDir = join(pkg, '../dist')
const scenariosDir = join(pkg, '../scenarios')
const snapshotPath = join(pkg, '../snapshots/gzip.json')

const THRESHOLD_PERCENT = 5
const isUpdate = process.argv.includes('--update')

type Snapshot = StringMap<{ gzip: number }>

async function listScenarios(groupDir: string): Promise<string[]> {
  try {
    const entries = await readdir(groupDir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

const current: Snapshot = {}

for (const group of ['source', 'package'] as const) {
  for (const scenario of await listScenarios(join(scenariosDir, group))) {
    const label = `${group}/${scenario}`
    const bundlePath = join(distDir, group, scenario, 'bundle.js')
    let raw: Buffer
    try {
      raw = await readFile(bundlePath)
    } catch {
      console.error(`SKIP [${label}] bundle.js missing — run pnpm build first`)
      continue
    }
    current[label] = { gzip: gzipSync(raw).length }
  }
}

if (isUpdate) {
  await writeFile(snapshotPath, JSON.stringify(current, null, 2) + '\n')
  console.log(`Wrote ${Object.keys(current).length} baseline(s) to snapshots/gzip.json:`)
  for (const [label, { gzip }] of Object.entries(current)) {
    console.log(`  ${label}: ${gzip} bytes gzip`)
  }
  process.exit(0)
}

let snapshot: Snapshot
try {
  snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as Snapshot
} catch {
  console.error(
    'FAIL no snapshots/gzip.json baseline exists — run `pnpm gzip:update` to record one, ' +
      'review the diff, and commit it.',
  )
  process.exit(1)
}

let failures = 0

for (const [label, { gzip }] of Object.entries(current)) {
  const baseline = snapshot[label]?.gzip
  if (baseline === undefined) {
    console.error(
      `FAIL [${label}] no baseline recorded — run \`pnpm gzip:update\` and commit the new ` +
        `snapshots/gzip.json`,
    )
    failures++
    continue
  }
  const delta = gzip - baseline
  const pct = (delta / baseline) * 100
  if (pct > THRESHOLD_PERCENT) {
    console.error(
      `FAIL [${label}]: ${gzip} bytes (+${delta}, +${pct.toFixed(1)}%) — ` +
        `exceeds ${THRESHOLD_PERCENT}% regression threshold (baseline: ${baseline})`,
    )
    failures++
  } else {
    const sign = delta >= 0 ? '+' : ''
    console.log(`  pass   ${label}: ${gzip} bytes (${sign}${delta} vs baseline)`)
  }
}

// A baseline entry with no matching built scenario is stale — either the scenario was deleted, or
// this run built a narrower set than the snapshot expects. Either way it's silently untrustworthy
// until someone runs `pnpm gzip:update`.
for (const label of Object.keys(snapshot)) {
  if (!(label in current)) {
    console.error(
      `FAIL [${label}] baseline exists but no built scenario matches it (stale — deleted or ` +
        `renamed?) — run \`pnpm gzip:update\` to prune it`,
    )
    failures++
  }
}

if (failures > 0) {
  console.error(`\n${failures} issue(s) found`)
  process.exit(1)
} else {
  console.log(`\nAll scenarios within gzip threshold`)
}
