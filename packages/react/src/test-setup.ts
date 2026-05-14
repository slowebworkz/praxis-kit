// Required for React's act() to work in Vitest's jsdom environment.
// Without this, React emits "not configured to support act(...)" warnings.
// @ts-expect-error — IS_REACT_ACT_ENVIRONMENT is a React-internal global
globalThis.IS_REACT_ACT_ENVIRONMENT = true
