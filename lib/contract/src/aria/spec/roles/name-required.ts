// Roles that always require an accessible name per WAI-ARIA APG.
// Source: WAI-ARIA 1.2 "Name From" / "Required States and Properties" + APG authoring practices.
//
// Intentionally minimal. Dialog and landmark names are enforced via contracts (`ariaContract`)
// rather than the built-in pipeline so consumers can opt in; `img` is built in because `role=img`
// on any element (including a bare `<img>`) is definitionally useless without a name. Accessible
// naming is more nuanced than "role → aria-label required" (native naming, text content, host
// semantics), so widen this set only alongside the naming logic that handles those.
export const NAME_REQUIRED_ROLES: ReadonlySet<string> = new Set(['img'])
