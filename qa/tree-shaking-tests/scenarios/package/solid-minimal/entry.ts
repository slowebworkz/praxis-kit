/**
 * Package-boundary counterpart to scenarios/source/solid-minimal — see react-minimal/entry.ts for
 * the package-vs-source rationale. `praxis-kit/solid` didn't exist when the other package/*
 * scenarios were added; it does now (packages/kit gained a real Solid JSX transform via
 * unplugin-solid — see DECISIONS.md).
 */
import { createContractComponent } from 'praxis-kit/solid'

export { createContractComponent }
