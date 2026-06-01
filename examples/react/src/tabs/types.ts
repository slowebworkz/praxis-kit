import type { HTMLAttributes } from 'react'

export type ContractProps<T extends HTMLElement> = HTMLAttributes<T>

export interface ValueProps {
  value: string
}

export interface RootProps extends ContractProps<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?(value: string): void
}

export type TriggerProps = ContractProps<HTMLButtonElement> & ValueProps

export type ContentProps = ContractProps<HTMLDivElement> & ValueProps

export type IndicatorProps = ContractProps<HTMLSpanElement>
