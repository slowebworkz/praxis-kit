import { SlotValidator as BaseSlotValidator } from '@praxis-ui/adapter-utils'
import type { StrictMode } from '@praxis-ui/core'

export class SlotValidator extends BaseSlotValidator {
  constructor(name: string, strict: StrictMode) {
    super(name, strict, 'React element')
  }
}
