// Post-build step for packages/kit.
//
// 1. Rewrites the bare `@praxis-kit/diagnostics` specifier left external by
//    tsup to a relative path into dist/_shared/. Relative imports inside a
//    package bypass the exports map in both Node and TypeScript, so the shared
//    module resolves for consumers without becoming a public subpath.
// 2. Enforces the nominal-identity invariant: the Diagnostics class (private
//    members ⇒ nominal typing) must be declared exactly once across dist,
//    in both the d.ts and JS output. Duplicates mean some entry bundled its
//    own copy again, which silently breaks cross-entry assignability.

import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT_DIR, 'dist')
const SHARED = join(DIST, '_shared', 'diagnostics.js')
const SPECIFIER = '@praxis-kit/diagnostics'

// tsup only bundles JS/d.ts — the Tailwind v4 safelist is a plain CSS file
// consumed directly by Tailwind's `@source inline(...)` directive, so it must
// be copied into dist verbatim. Without this, the `./tailwind.css` export in
// package.json resolves to a file the build never produced.
mkdirSync(join(DIST, 'tailwind'), { recursive: true })
copyFileSync(
  join(ROOT_DIR, '..', '..', 'lib', 'tailwind', 'src', 'tailwind-safelist.css'),
  join(DIST, 'tailwind', 'safelist.css'),
)
console.log('postbuild: copied tailwind safelist.css into dist/tailwind/')

const files = readdirSync(DIST, { recursive: true })
  .map((f) => join(DIST, String(f)))
  .filter((f) => /\.(js|cjs|mjs|d\.ts|d\.cts|d\.mts)$/.test(f))

// --- 1. specifier rewrite -------------------------------------------------

let rewritten = 0
for (const file of files) {
  const source = readFileSync(file, 'utf8')
  if (!source.includes(SPECIFIER)) continue

  let rel = relative(dirname(file), SHARED).split(sep).join('/')
  if (!rel.startsWith('.')) rel = `./${rel}`

  writeFileSync(
    file,
    source.replaceAll(`'${SPECIFIER}'`, `'${rel}'`).replaceAll(`"${SPECIFIER}"`, `"${rel}"`),
  )
  rewritten++
}
console.log(`postbuild: rewrote ${SPECIFIER} in ${rewritten} file(s)`)

// --- 2. single-declaration invariant ---------------------------------------

const errors = []
// d.ts declares `class Diagnostics`; esbuild emits `var Diagnostics = class`.
for (const [pattern, kind] of [
  [/\bclass Diagnostics\b/, 'd.ts'],
  [/\bDiagnostics = class\b|\bclass Diagnostics\b/, 'js'],
]) {
  const matching = files.filter((f) =>
    kind === 'd.ts' ? /\.d\.(ts|cts|mts)$/.test(f) : /\.(js|cjs|mjs)$/.test(f),
  )
  const found = matching.filter((f) => pattern.test(readFileSync(f, 'utf8')))
  if (found.length !== 1) {
    errors.push(
      `expected exactly 1 ${kind} file declaring class Diagnostics, found ${found.length}:` +
        found.map((f) => `\n  ${relative(DIST, f)}`).join(''),
    )
  }
}

// Warn on any other class declared in more than one d.ts — if it has private
// members it has the same nominal-split problem Diagnostics had.
const declaredIn = new Map()
for (const file of files.filter((f) => /\.d\.(ts|cts|mts)$/.test(f))) {
  const names = new Set(
    [...readFileSync(file, 'utf8').matchAll(/^declare class ([A-Za-z0-9_$]+)/gm)].map((m) => m[1]),
  )
  for (const name of names) {
    if (!declaredIn.has(name)) declaredIn.set(name, [])
    declaredIn.get(name).push(relative(DIST, file))
  }
}
for (const [name, locations] of declaredIn) {
  if (locations.length > 1) {
    console.warn(
      `postbuild: warning — class ${name} declared in ${locations.length} d.ts files ` +
        `(nominal-split risk if it has private members): ${locations.join(', ')}`,
    )
  }
}

if (errors.length > 0) {
  console.error(`postbuild: FAILED\n${errors.join('\n')}`)
  process.exit(1)
}
console.log('postbuild: Diagnostics single-declaration invariant holds')
