// `<table>`'s only well-established explicit-role alternates to its implicit `table` role, per
// the WAI-ARIA "ARIA in HTML" recommendation. Unlike `input`/`img`, this isn't context-dependent —
// it doesn't vary with props — so it's a flat list rather than a lookup keyed by a prop value.
export const ALLOWED_TABLE_ROLES: readonly string[] = ['grid', 'treegrid']
