import { SlotValidator as BaseSlotValidator } from '@praxis-kit/adapter-utils'
import type { Diagnostics } from '@praxis-kit/diagnostics'

export class SlotValidator extends BaseSlotValidator {
  constructor(name: string, diagnostics: Diagnostics) {
    super(name, diagnostics, 'React element')
  }
}
