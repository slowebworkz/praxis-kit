import data from '../contract/diagnostics.contract.json'
import type { DiagnosticsContract } from './contract'

/**
 * The contract data (`praxis-kit-diagnostics/contract`). Pass it to `validateCatalog`. It is its own
 * entry so a runtime bundle that only resolves messages never contains it.
 */
const contract = data as unknown as DiagnosticsContract
export default contract
