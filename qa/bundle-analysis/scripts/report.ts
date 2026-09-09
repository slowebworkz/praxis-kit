/**
 * Prints a human-readable composition breakdown for every built scenario and writes
 * dist/<group>/<scenario>/composition.json with the full data.
 *
 * Run after `pnpm build`. Diagnostic only — does not exit with an error code and is deliberately
 * excluded from `pnpm test`, matching tree-shaking-tests' own report.ts precedent: a byte-
 * attribution table is for a person investigating drift after touching tsdown.config.ts, not a
 * pass/fail signal worth the interpretation cost on every push.
 *
 * source/* scenarios get a real per-package byte breakdown (esbuild's metafile attributes bytes to
 * the original TypeScript source file that contributed them). package/* scenarios resolve to a
 * single `praxis-kit` bucket — packages/kit's own tsdown build already collapsed every source file
 * into one physical dist chunk per entry, so there's no finer-grained attribution left to recover
 * at this tier. That's expected, not a bug: source/* is this tool's composition-breakdown tier,
 * package/* is its real-consumer-size tier (see scripts/analyze.ts).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { toPackageName } from '@praxis-kit/tree-shaking-tests'
import type { AnyRecord, StringMap } from '@praxis-kit/primitive'

const pkg = dirname(fileURLToPath(import.meta.url))
const distDir = join(pkg, '../dist')
const scenariosDir = join(pkg, '../scenarios')

type OutputData = {
  inputs: StringMap<{ bytesInOutput: number }>
  imports?: Array<{ path: string; external?: boolean }>
}
type Metafile = { inputs: AnyRecord; outputs: StringMap<OutputData> }

type CompositionEntry = {
  totalLiveBytes: number
  gzipBytes: number
  byPackage: StringMap<number>
  byFile: Array<{ path: string; bytesInOutput: number; package: string | undefined }>
  externals: string[]
}

async function listScenarios(groupDir: string): Promise<string[]> {
  try {
    const entries = await readdir(groupDir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

function buildComposition(metafile: AnyRecord, gzipBytes: number): CompositionEntry {
  const mf = metafile as Metafile
  const byFile: CompositionEntry['byFile'] = []
  const byPackage: StringMap<number> = {}
  const externals = new Set<string>()
  let totalLiveBytes = 0

  for (const outData of Object.values(mf.outputs)) {
    for (const [path, data] of Object.entries(outData.inputs)) {
      if (data.bytesInOutput <= 0) continue
      const packageName = toPackageName(path)
      byFile.push({ path, bytesInOutput: data.bytesInOutput, package: packageName })
      totalLiveBytes += data.bytesInOutput
      if (packageName) byPackage[packageName] = (byPackage[packageName] ?? 0) + data.bytesInOutput
    }
    for (const imp of outData.imports ?? []) {
      if (imp.external) externals.add(imp.path)
    }
  }

  byFile.sort((a, b) => b.bytesInOutput - a.bytesInOutput)

  return { totalLiveBytes, gzipBytes, byPackage, byFile, externals: [...externals].sort() }
}

console.log('\nBundle composition report\n' + '─'.repeat(80))

for (const group of ['source', 'package'] as const) {
  for (const scenario of await listScenarios(join(scenariosDir, group))) {
    const label = `${group}/${scenario}`
    const outDir = join(distDir, group, scenario)

    let metafile: AnyRecord
    let bundleRaw: Buffer
    try {
      metafile = JSON.parse(await readFile(join(outDir, 'meta.json'), 'utf8')) as AnyRecord
      bundleRaw = await readFile(join(outDir, 'bundle.js'))
    } catch {
      console.log(`  ${label} (not built — run pnpm build)`)
      continue
    }

    const gzipBytes = gzipSync(bundleRaw).length
    const composition = buildComposition(metafile, gzipBytes)
    await writeFile(join(outDir, 'composition.json'), JSON.stringify(composition, null, 2) + '\n')

    console.log(`\n${label}`)
    console.log(`  total live: ${composition.totalLiveBytes}B  gzip: ${composition.gzipBytes}B`)
    const shares = Object.entries(composition.byPackage).sort((a, b) => b[1] - a[1])
    for (const [name, bytes] of shares) {
      const pct = ((bytes / composition.totalLiveBytes) * 100).toFixed(1)
      console.log(`    ${name.padEnd(30)}${String(bytes).padStart(8)}B  ${pct}%`)
    }
    if (composition.externals.length > 0) {
      console.log(`  externals: ${composition.externals.join(', ')}`)
    }
  }
}

console.log('\n' + '─'.repeat(80))
