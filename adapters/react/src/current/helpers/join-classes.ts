export function joinClasses(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
