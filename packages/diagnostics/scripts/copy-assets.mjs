// Ships the English catalog and its schema as plain JSON next to the compiled entries, so
// translators and tools can read them without importing JavaScript.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
mkdirSync(join(root, 'dist'), { recursive: true })
copyFileSync(join(root, 'catalog', 'en.json'), join(root, 'dist', 'en.json'))
copyFileSync(
  join(root, 'schema', 'catalog.v1.schema.json'),
  join(root, 'dist', 'catalog.v1.schema.json'),
)
copyFileSync(
  join(root, 'contract', 'diagnostics.contract.json'),
  join(root, 'dist', 'diagnostics.contract.json'),
)
console.log('copied en.json, the schema and diagnostics.contract.json into dist/')
