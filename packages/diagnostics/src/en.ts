import catalog from '../catalog/en.json'
import type { MessageCatalog } from './types'

/** The English catalog. Importing it is what puts English in a bundle; import another locale instead to leave it out. */
const en: MessageCatalog = catalog
export default en
