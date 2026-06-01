import { isValidElement } from 'react'
import type { ReactElement } from 'react'

export const isType =
  (type: unknown) =>
  (child: unknown): child is ReactElement =>
    isValidElement(child) && child.type === type
