import { readFileSync } from 'node:fs'
import { checkCatalog } from './check'
import type { Issue, Report } from './check'
import contractData from './contract-entry'
import type { DiagnosticsContract } from './contract'
import en from './en'
import { createMessageResolver } from './resolver'

// The `praxis-kit-diagnostics` command. A thin wrapper over `checkCatalog`, so a language pack's CI
// can validate a catalog without writing any code:
//
//   praxis-kit-diagnostics validate catalog/fr.json --min-coverage 80
//   praxis-kit-diagnostics export-source --format md > translator-sheet.md
//
// `run` takes its input and output as parameters, so tests drive it without spawning a process.

export interface Io {
  stdout: (text: string) => void
  stderr: (text: string) => void
  readFile: (path: string) => string
}

const defaultIo: Io = {
  stdout: (text) => void process.stdout.write(text),
  stderr: (text) => void process.stderr.write(text),
  readFile: (path) => readFileSync(path, 'utf8'),
}

/** 0 valid; 1 the catalog is invalid; 2 valid but below `--min-coverage`; 64 bad usage. */
export const EXIT = { ok: 0, invalid: 1, lowCoverage: 2, usage: 64 } as const

const USAGE = `praxis-kit-diagnostics <command>

Commands
  validate <catalog.json>   Check a catalog against the diagnostics contract.
      --json                  Print the report as JSON.
      --min-coverage <n>      Exit 2 if fewer than n% of the contract's ids are translated.
      --fail-on-obsolete      Exit 1 if the catalog translates ids the contract has removed.
      --contract <file>       Validate against another contract file (for example a published
                              version's contract.json) instead of the one bundled here.
  export-source             Print what a translator needs for every id: the English source, what
                            the rule means, the context values, spec links and real examples.
      --format json|md        Default json.

Exit codes: 0 valid, 1 invalid, 2 below --min-coverage, 64 bad usage.
`

const VALUE_FLAGS = new Set(['min-coverage', 'contract', 'format'])
const BOOLEAN_FLAGS = new Set(['json', 'fail-on-obsolete', 'help'])

interface Parsed {
  command: string | undefined
  positional: string[]
  flags: Map<string, string | true>
  problem: string | undefined
}

function parse(argv: readonly string[]): Parsed {
  const parsed: Parsed = {
    command: undefined,
    positional: [],
    flags: new Map(),
    problem: undefined,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string
    if (!arg.startsWith('--')) {
      if (parsed.command === undefined) parsed.command = arg
      else parsed.positional.push(arg)
      continue
    }
    const [name, inline] = arg.slice(2).split(/=(.*)/s, 2) as [string, string | undefined]
    if (BOOLEAN_FLAGS.has(name)) {
      parsed.flags.set(name, true)
    } else if (VALUE_FLAGS.has(name)) {
      const value = inline ?? argv[++i]
      if (value === undefined) parsed.problem = `--${name} needs a value.`
      else parsed.flags.set(name, value)
    } else {
      parsed.problem = `Unknown option --${name}.`
    }
  }
  return parsed
}

// ─── validate ─────────────────────────────────────────────────────────────────

const line = (issue: Issue): string => {
  const where = [issue.id, issue.field, issue.form].filter(Boolean).join(' › ')
  return `  ${issue.kind}${where ? `  ${where}` : ''}\n      ${issue.message}`
}

/** The human-readable report. Structural problems come first and are kept apart from completeness. */
export function formatReport(report: Report, file: string): string {
  const out: string[] = []
  const { contract } = report
  out.push(`${file}: checked against contract ${contract.runtime}`)
  if (contract.catalog !== undefined) out.push(`catalog targets contract ${contract.catalog}`)
  out.push('')
  out.push(`Errors: ${report.errors.length}`)
  out.push(...report.errors.map(line))
  if (report.warnings.length > 0) {
    out.push('', `Warnings: ${report.warnings.length}`, ...report.warnings.map(line))
  }
  if (report.obsolete.length > 0) {
    out.push('', `Obsolete (the contract removed these ids): ${report.obsolete.length}`)
    for (const o of report.obsolete) {
      out.push(
        `  ${o.id}  removed in ${o.removedIn}${o.replacedBy ? `, replaced by ${o.replacedBy}` : ''}`,
      )
    }
  }
  if (report.deprecated.length > 0) {
    out.push('', `Deprecated (still render): ${report.deprecated.length}`)
    for (const d of report.deprecated) {
      out.push(`  ${d.id}  since ${d.since}${d.replacedBy ? `, use ${d.replacedBy}` : ''}`)
    }
  }
  out.push('', `Incomplete: ${report.incomplete.length}`)
  for (const i of report.incomplete)
    out.push(`  ${i.id}  (since ${i.since})  missing ${i.missing.join(', ')}`)
  const { translated, total, ratio } = report.coverage
  out.push('', `Coverage: ${translated}/${total} ids (${Math.round(ratio * 100)}%)`)
  out.push(report.errors.length === 0 ? 'Structurally valid.' : 'NOT valid: fix the errors above.')
  return `${out.join('\n')}\n`
}

function loadContract(path: string | true | undefined, io: Io): DiagnosticsContract {
  if (typeof path !== 'string') return contractData
  return JSON.parse(io.readFile(path)) as DiagnosticsContract
}

function validateCommand(parsed: Parsed, io: Io): number {
  const file = parsed.positional[0]
  if (file === undefined) {
    io.stderr('validate needs a catalog file.\n\n' + USAGE)
    return EXIT.usage
  }
  const rawMin = parsed.flags.get('min-coverage')
  const minCoverage = typeof rawMin === 'string' ? Number(rawMin) : undefined
  if (minCoverage !== undefined && !(minCoverage >= 0 && minCoverage <= 100)) {
    io.stderr('--min-coverage must be a number from 0 to 100.\n')
    return EXIT.usage
  }

  let contract: DiagnosticsContract
  let catalog: unknown
  try {
    contract = loadContract(parsed.flags.get('contract'), io)
  } catch (error_) {
    io.stderr(`Cannot read the contract: ${String(error_)}\n`)
    return EXIT.usage
  }
  try {
    catalog = JSON.parse(io.readFile(file))
  } catch (error_) {
    io.stderr(`${file}: ${String(error_)}\n`)
    return EXIT.invalid
  }

  const report = checkCatalog(catalog, contract)
  io.stdout(
    parsed.flags.has('json') ? `${JSON.stringify(report, null, 2)}\n` : formatReport(report, file),
  )

  if (report.errors.length > 0) return EXIT.invalid
  if (parsed.flags.has('fail-on-obsolete') && report.obsolete.length > 0) return EXIT.invalid
  if (minCoverage !== undefined && report.coverage.ratio * 100 < minCoverage)
    return EXIT.lowCoverage
  return EXIT.ok
}

// ─── export-source ────────────────────────────────────────────────────────────

/** Everything a translator needs for one id, with English rendered for each real example. */
export function buildSourceSheet(contract: DiagnosticsContract) {
  const resolve = createMessageResolver(en)
  return {
    contract: { major: contract.contract, minor: contract.minor },
    kinds: contract.kinds,
    ids: Object.entries(contract.ids)
      .filter(([, spec]) => spec.removedIn === undefined)
      .map(([id, spec]) => ({
        id,
        codes: spec.codes,
        category: spec.category,
        severity: spec.severity,
        description: spec.description,
        specs: spec.specs ?? [],
        context: spec.context ?? {},
        plural: spec.plural,
        english: Object.hasOwn(en.messages, id) ? en.messages[id] : undefined,
        examples: spec.examples.map((facts) => ({ facts, english: resolve(facts) })),
      })),
  }
}

function toMarkdown(sheet: ReturnType<typeof buildSourceSheet>): string {
  const out = [
    `# Diagnostic messages to translate (contract ${sheet.contract.major}.${sheet.contract.minor})`,
    '',
  ]
  out.push('Context kinds:', '')
  for (const [kind, text] of Object.entries(sheet.kinds)) out.push(`- \`${kind}\`: ${text}`)
  for (const entry of sheet.ids) {
    out.push(
      '',
      `## ${entry.id}`,
      '',
      entry.description,
      '',
      `Codes: ${entry.codes.join(', ')} · ${entry.category}${entry.severity ? ` · ${entry.severity}` : ''}`,
    )
    if (entry.specs.length > 0) out.push('', ...entry.specs.map((s) => `- [${s.name}](${s.url})`))
    const keys = Object.entries(entry.context)
    if (keys.length > 0) {
      out.push('', '| Context key | Kind | Essential | Meaning |', '| --- | --- | --- | --- |')
      for (const [key, spec] of keys) {
        out.push(
          `| \`{${key}}\` | ${spec.kind} | ${spec.informational ? 'tooling only' : spec.essential ? 'yes' : 'no'} | ${spec.description} |`,
        )
      }
    }
    if (entry.plural) out.push('', `Plural forms are chosen by \`{${entry.plural}}\`.`)
    if (entry.english) {
      out.push('', '```json', JSON.stringify(entry.english, null, 2), '```')
    }
    const shown = entry.examples.filter((e) => e.english).slice(0, 2)
    if (shown.length > 0) {
      out.push('', 'Examples:')
      for (const example of shown) {
        out.push(
          '',
          `- context \`${JSON.stringify(example.facts.context ?? {})}\``,
          `  - ${example.english?.message}`,
        )
      }
    }
  }
  return `${out.join('\n')}\n`
}

function exportSourceCommand(parsed: Parsed, io: Io): number {
  const format = parsed.flags.get('format') ?? 'json'
  if (format !== 'json' && format !== 'md') {
    io.stderr('--format must be json or md.\n')
    return EXIT.usage
  }
  const sheet = buildSourceSheet(contractData)
  io.stdout(format === 'md' ? toMarkdown(sheet) : `${JSON.stringify(sheet, null, 2)}\n`)
  return EXIT.ok
}

// ─── entry ────────────────────────────────────────────────────────────────────

export function run(argv: readonly string[], io: Io = defaultIo): number {
  const parsed = parse(argv)
  if (parsed.flags.has('help') || (parsed.command === undefined && parsed.problem === undefined)) {
    io.stdout(USAGE)
    return parsed.command === undefined && !parsed.flags.has('help') ? EXIT.usage : EXIT.ok
  }
  if (parsed.problem !== undefined) {
    io.stderr(`${parsed.problem}\n\n${USAGE}`)
    return EXIT.usage
  }
  switch (parsed.command) {
    case 'validate':
      return validateCommand(parsed, io)
    case 'export-source':
      return exportSourceCommand(parsed, io)
    default:
      io.stderr(`Unknown command "${parsed.command}".\n\n${USAGE}`)
      return EXIT.usage
  }
}
