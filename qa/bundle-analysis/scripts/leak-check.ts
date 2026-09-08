/**
 * Two independent isolation checks per scenario, run after `pnpm build`. Named distinctly from
 * tree-shaking-tests' assert.ts — a different question (isolation *correctness*: does this
 * scenario contain code it has no business containing) rather than tree-shaking *inclusion* (does
 * a scenario retain the code it should).
 *
 * 1. Live-file leak — does any live input path belong to an adapter (or lib/tailwind /
 *    packages/kit/dist/<other-entry>) other than this scenario's own owner? A framework-neutral
 *    scenario (contract/guards/html/utils) must contain none of them at all. Runs against both
 *    tiers: source/* checks workspace source dirs (adapters/vue/, …), package/* checks
 *    packages/kit's own per-entry dist dirs (packages/kit/dist/vue/, …) — a genuine cross-entry
 *    leak would show up as a foreign entry's dist chunk getting pulled into another entry's
 *    output, which is exactly the bug postbuild.ts's diagnostics-rewrite step could in principle
 *    introduce if it ever rewrote the wrong specifier.
 * 2. External-peer leak — the genuinely new signal a byte-count check structurally cannot see:
 *    walk the metafile's externalized imports and flag any bare specifier belonging to a framework
 *    OTHER than this scenario's own declared peer. A foreign peer import is always externalized to
 *    0 bytesInOutput (esbuild never resolves an external specifier's contents), so
 *    assert.ts's mustExclude technique — built entirely on live *byte* attribution — cannot catch
 *    it. E.g. a stray `export * from 'solid-js'` inside the react adapter's index.ts would pass
 *    every existing byte-based check while still being a real, shipped, broken dependency edge.
 *
 *    Deliberately narrow: this only flags an externalized specifier that belongs to *another
 *    known Praxis framework owner* (OWNERS, below) — it answers "did one Praxis adapter acquire
 *    another Praxis adapter's peer," not "is every external dependency in this bundle expected."
 *    An unrelated, unrecognized external (some third-party runtime dependency neither this table
 *    nor any adapter's own peer list knows about) passes silently. That's intentional scope, not
 *    an oversight — broadening this into a general external-dependency policy checker would dilute
 *    a currently crisp, cheap invariant into a much fuzzier one; not done here.
 *
 * `process.exit(1)` on any failure, matching assert.ts's own pass/fail convention.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AnyRecord, StringMap } from '@praxis-kit/primitive'

const pkg = dirname(fileURLToPath(import.meta.url))
const distDir = join(pkg, '../dist')
const scenariosDir = join(pkg, '../scenarios')

type MetafileImport = { path: string; external?: boolean }
type OutputData = { inputs: StringMap<{ bytesInOutput: number }>; imports?: MetafileImport[] }
type Metafile = { inputs: AnyRecord; outputs: StringMap<OutputData> }

type Owner = {
  /** This owner's real workspace source dir — present only for owners with a source/* scenario
   * (the framework adapters + tailwind). Any OTHER owner's sourceDir appearing as a live input
   * path in this scenario is a leak. */
  sourceDir?: string
  /** This owner's subpath under packages/kit's built dist/ — present for every owner (every scope
   * item is a real praxis-kit export). Any OTHER owner's distDir appearing as a live input path is
   * the package-tier equivalent of the sourceDir check. */
  distDir: string
  /** Bare specifiers legitimately externalized for this owner's own framework peer — empty for
   * framework-neutral entries and for adapters with no runtime peer import (web, svelte, tailwind).
   * Hand-mirrored from packages/kit/tsdown.config.ts's own per-entry `deps.neverBundle` lists —
   * NOT imported from there (deliberately: tsdown.config.ts is an executable build config with its
   * own heavy devDependencies — tsdown, unplugin-solid — importing it here just to read a few
   * peer-pattern arrays would be a real-import version of the "too clever and brittle" problem
   * that ruled out AST-parsing it instead). This is a known duplication, not a false claim of a
   * single source of truth: if tsdown.config.ts's neverBundle for a framework ever changes, this
   * table must be updated by hand to match, and nothing here will notice the drift automatically.
   * The correct eventual fix is a small shared, side-effect-free data module (peer patterns +
   * source dirs only, no tsdown/unplugin-solid imports) that both tsdown.config.ts and this file
   * import — tracked as a follow-up, not done in this change. See DECISIONS.md.
   */
  ownPeers: RegExp[]
}

// react / react-legacy intentionally share one ownership domain (same sourceDir, same distDir):
// they're both the React adapter, differing only in which API surface they expose
// (render-callback vs. asChild-only polymorphism), and packages/kit's tsdown build emits both
// under the same `react/` dist family. A known, accepted limitation follows from this: this check
// cannot detect `react/legacy` accidentally depending on something that only the current API
// exposes, or vice versa, at either tier — sharing a domain means neither direction is ever
// compared against the other. If the two surfaces are ever meant to be independently
// tree-shakeable of each other (not just of the other frameworks), they'd need separate ownership
// domains — not needed today, since both draw from the same adapters/react/src tree by design.
const OWNERS: StringMap<Owner> = {
  react: {
    sourceDir: 'adapters/react/',
    distDir: 'packages/kit/dist/react/',
    ownPeers: [/^react$/, /^react\//, /^react-dom$/, /^react-dom\//],
  },
  'react-legacy': {
    sourceDir: 'adapters/react/',
    distDir: 'packages/kit/dist/react/',
    ownPeers: [/^react$/, /^react\//, /^react-dom$/, /^react-dom\//],
  },
  preact: {
    sourceDir: 'adapters/preact/',
    distDir: 'packages/kit/dist/preact/',
    ownPeers: [/^preact$/, /^preact\//],
  },
  vue: {
    sourceDir: 'adapters/vue/',
    distDir: 'packages/kit/dist/vue/',
    ownPeers: [/^vue$/, /^vue\//, /^@vue\//],
  },
  solid: {
    sourceDir: 'adapters/solid/',
    distDir: 'packages/kit/dist/solid/',
    ownPeers: [/^solid-js$/, /^solid-js\//],
  },
  svelte: { sourceDir: 'adapters/svelte/', distDir: 'packages/kit/dist/svelte/', ownPeers: [] },
  lit: {
    sourceDir: 'adapters/lit/',
    distDir: 'packages/kit/dist/lit/',
    ownPeers: [/^lit$/, /^lit\//, /^lit-/, /^@lit\//, /^@lit-labs\//],
  },
  web: { sourceDir: 'adapters/web/', distDir: 'packages/kit/dist/web/', ownPeers: [] },
  tailwind: { sourceDir: 'lib/tailwind/', distDir: 'packages/kit/dist/tailwind/', ownPeers: [] },
  contract: { distDir: 'packages/kit/dist/contract/', ownPeers: [] },
  guards: { distDir: 'packages/kit/dist/guards/', ownPeers: [] },
  html: { distDir: 'packages/kit/dist/html/', ownPeers: [] },
  utils: { distDir: 'packages/kit/dist/utils/', ownPeers: [] },
}

function getLiveInputPaths(metafile: Metafile): string[] {
  const live: string[] = []
  for (const outData of Object.values(metafile.outputs)) {
    for (const [path, data] of Object.entries(outData.inputs)) {
      if (data.bytesInOutput > 0) live.push(path)
    }
  }
  return live
}

function checkLiveFileLeak(group: 'source' | 'package', name: string, metafile: Metafile): string[] {
  const owner = OWNERS[name]
  if (!owner) return []
  const ownDir = group === 'source' ? owner.sourceDir : owner.distDir
  const live = getLiveInputPaths(metafile)
  const failures: string[] = []

  for (const [otherName, otherOwner] of Object.entries(OWNERS)) {
    if (otherName === name) continue
    const otherDir = group === 'source' ? otherOwner.sourceDir : otherOwner.distDir
    if (!otherDir || otherDir === ownDir) continue // shared family (react / react-legacy)

    const matched = live.filter((p) => p.includes(otherDir))
    if (matched.length > 0) {
      failures.push(
        `LEAK [${group}/${name}] contains live code from ${otherName} (${otherDir}):\n` +
          matched.map((p) => `       ${p}`).join('\n'),
      )
    }
  }

  return failures
}

function checkExternalPeerLeak(
  group: 'source' | 'package',
  name: string,
  metafile: Metafile,
): string[] {
  const owner = OWNERS[name]
  if (!owner) return []
  const failures: string[] = []
  const seen = new Set<string>()

  for (const outData of Object.values(metafile.outputs)) {
    for (const imp of outData.imports ?? []) {
      if (!imp.external || imp.path.startsWith('node:') || seen.has(imp.path)) continue
      if (owner.ownPeers.some((re) => re.test(imp.path))) continue

      const foreign = Object.entries(OWNERS).find(
        ([otherName, otherOwner]) =>
          otherName !== name && otherOwner.ownPeers.some((re) => re.test(imp.path)),
      )
      if (foreign) {
        seen.add(imp.path)
        failures.push(
          `LEAK [${group}/${name}] references foreign framework peer "${imp.path}" ` +
            `(belongs to ${foreign[0]})`,
        )
      }
    }
  }

  return failures
}

async function listScenarios(groupDir: string): Promise<string[]> {
  try {
    const entries = await readdir(groupDir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

const allFailures: string[] = []
let passed = 0
let total = 0

for (const group of ['source', 'package'] as const) {
  const scenarios = await listScenarios(join(scenariosDir, group))

  for (const scenario of scenarios) {
    total++
    const label = `${group}/${scenario}`
    const metaPath = join(distDir, group, scenario, 'meta.json')

    let metafile: Metafile
    try {
      metafile = JSON.parse(await readFile(metaPath, 'utf8')) as Metafile
    } catch {
      allFailures.push(`FAIL [${label}] meta.json missing — run pnpm build first`)
      continue
    }

    const failures = [
      ...checkLiveFileLeak(group, scenario, metafile),
      ...checkExternalPeerLeak(group, scenario, metafile),
    ]

    if (failures.length === 0) {
      console.log(`  pass   ${label}`)
      passed++
    } else {
      for (const f of failures) console.error(f)
      allFailures.push(...failures)
    }
  }
}

console.log(`\n${passed}/${total} scenario(s) passed leak checks`)

if (allFailures.length > 0) {
  process.exit(1)
}
