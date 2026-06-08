import { SlotValidator as BaseSlotValidator } from '@praxis-kit/adapter-utils'
import type { StrictMode } from '@praxis-kit/core'

export class SlotValidator extends BaseSlotValidator {
  constructor(name: string, strict: StrictMode) {
    super(name, strict, 'React element')
  }
}
