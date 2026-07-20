// Roles that always require an accessible name per WAI-ARIA APG.
// Dialog and landmark names are enforced via contracts (ariaContract) rather than
// the built-in pipeline so consumers can opt in; img is built in because role=img
// on any element (including bare <img>) is definitionally useless without a name.
export const NAME_REQUIRED_ROLES: ReadonlySet<string> = new Set(['img'])
