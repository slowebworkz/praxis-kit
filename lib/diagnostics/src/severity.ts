export enum Severity {
  Debug,
  Info,
  Warning,
  Error,
  Fatal,
}

export function isAtLeast(s: Severity, threshold: Severity): boolean {
  return s >= threshold
}
