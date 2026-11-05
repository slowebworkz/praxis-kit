// Generates schema/catalog.v1.schema.json from the contract, so the JSON Schema can never disagree
// with it. One schema per contract major; this file is the generator and `src/schema.test.ts` fails if
// the committed schema is stale. Run it with `node scripts/build-schema.mjs` (the build does).
//
// The schema is for editor validation and autocomplete. It checks structure, the contract major and
// that no template is blank. It cannot express placeholders, filters or plural selectors against
// each id's context, so `praxis-kit-diagnostics validate` (the CLI) is the authority.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const nonBlank = { type: 'string', pattern: '\\S' }

export function buildSchema(contract) {
  // Live ids (deprecated ones still render, tombstones are gone). Offered as editor suggestions, not
  // enforced: an app may extend a catalog with ids of its own (custom rules).
  const ids = Object.entries(contract.ids)
    .filter(([, spec]) => spec.removedIn === undefined)
    .map(([id]) => id)
    .sort()

  const template = {
    description:
      'A template string, or a plural form chosen by a numeric context key. `other` is required: it is the fallback for every count no other form names.',
    oneOf: [
      nonBlank,
      {
        type: 'object',
        required: ['plural', 'other'],
        additionalProperties: false,
        properties: {
          plural: { type: 'string', description: 'The numeric context key that selects the form.' },
          zero: nonBlank,
          one: nonBlank,
          two: nonBlank,
          few: nonBlank,
          many: nonBlank,
          other: nonBlank,
        },
      },
    ],
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `https://github.com/slowebworkz/praxis-kit/blob/main/packages/diagnostics/schema/catalog.v${contract.contract}.schema.json`,
    title: `Praxis Kit diagnostic message catalog (contract ${contract.contract})`,
    description:
      'One catalog per locale. Keys under "messages" are message ids from the diagnostics contract. Templates use {name} placeholders, optionally piped through filters: {names|quote|list-unit}. Generated from the contract; ids of your own (custom rules) pass this schema, but the CLI accepts them only when declared with --extension. The CLI (`praxis-kit-diagnostics validate`) is the authority on placeholders, plurals and ids.',
    type: 'object',
    required: ['contract', 'locale', 'messages'],
    additionalProperties: false,
    properties: {
      $schema: { type: 'string' },
      $comment: { type: 'string' },
      contract: {
        const: contract.contract,
        description: `The contract major this catalog is written for. This schema is for contract ${contract.contract}.`,
      },
      builtAgainst: {
        type: 'string',
        pattern: '^[0-9]+\\.[0-9]+$',
        description: 'Advisory: the major.minor contract the author last checked against.',
      },
      locale: {
        type: 'string',
        minLength: 1,
        description: 'BCP 47 language tag. Selects the Intl.PluralRules and Intl.ListFormat rules.',
        examples: ['en', 'de', 'pt-BR'],
      },
      messages: {
        type: 'object',
        propertyNames: {
          type: 'string',
          pattern: '^[A-Za-z][A-Za-z0-9_.-]*$',
          description: 'A message id from the contract (suggested below), or an id of your own.',
          examples: ids,
        },
        additionalProperties: { $ref: '#/definitions/entry' },
      },
    },
    definitions: {
      template,
      entry: {
        type: 'object',
        required: ['message'],
        additionalProperties: false,
        properties: {
          $comment: { type: 'string', description: 'Notes for translators. Never rendered.' },
          message: { $ref: '#/definitions/template' },
          rationale: { $ref: '#/definitions/template' },
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['title'],
              additionalProperties: false,
              properties: {
                title: { $ref: '#/definitions/template' },
                description: { $ref: '#/definitions/template' },
                fix: {
                  type: 'string',
                  description: 'Code to copy. Placeholders are filled in; it is not translated.',
                },
              },
            },
          },
        },
      },
    },
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const isMain =
  process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href
if (isMain) {
  const contract = JSON.parse(
    readFileSync(join(root, 'contract', 'diagnostics.contract.json'), 'utf8'),
  )
  const out = join(root, 'schema', `catalog.v${contract.contract}.schema.json`)
  writeFileSync(out, `${JSON.stringify(buildSchema(contract), null, 2)}\n`)
  console.log(`wrote ${out.slice(root.length + 1)}`)
}
