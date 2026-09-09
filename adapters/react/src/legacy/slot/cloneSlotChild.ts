import { makeCloneSlotChild } from '../../shared'
import { getChildRef } from './composeRefs'

export const cloneSlotChild = makeCloneSlotChild(getChildRef)
