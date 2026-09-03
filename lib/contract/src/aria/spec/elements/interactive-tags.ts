// Native HTML tags that *may* carry interactive semantics. Membership here is a coarse candidate
// set — whether a given element is actually focusable/interactive still depends on its attributes
// and state (`<a>` needs `href`, `<input type="hidden">` is not focusable, `disabled` removes a
// control from the tab order). Consumers that need the real answer must inspect props.
// Source: HTML — "interactive content" category + the focusable/tabbable rules.
export const NATIVE_INTERACTIVE_TAGS: ReadonlySet<string> = new Set([
  'a',
  'button',
  'input',
  'select',
  'textarea',
])
