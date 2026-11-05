// Ships the English catalog, the schemas and the contract as plain JSON next to the compiled entries,
// so translators and tools can read them without importing JavaScript.
//
// Every schema/catalog.v<N>.schema.json is copied (older majors are frozen files that stay exported),
// and `schema.json` is a copy of the one for the current contract major.
import { copyFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
mkdirSync(dist, { recursive: true })

const contractFile = join(root, 'contract', 'diagnostics.contract.json')
const { contract: major } = JSON.parse(readFileSync(contractFile, 'utf8'))

copyFileSync(join(root, 'catalog', 'en.json'), join(dist, 'en.json'))
copyFileSync(contractFile, join(dist, 'diagnostics.contract.json'))

const schemas = readdirSync(join(root, 'schema')).filter((f) =>
  /^catalog\.v\d+\.schema\.json$/.test(f),
)
for (const file of schemas) copyFileSync(join(root, 'schema', file), join(dist, file))
copyFileSync(join(root, 'schema', `catalog.v${major}.schema.json`), join(dist, 'schema.json'))

console.log(`copied en.json, the contract and ${schemas.length} schema(s) into dist/`)
