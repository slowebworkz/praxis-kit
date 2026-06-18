export function parseAttributes(html: string): Record<string, string> {
  const container = document.createElement('div')
  container.innerHTML = html
  const el = container.firstElementChild
  if (!el) return {}
  const attrs: Record<string, string> = {}
  for (const { name, value } of el.attributes) {
    attrs[name] = value
  }
  return attrs
}

export function normalizeAttrs(attrs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(attrs)) {
    out[k] = k === 'class' ? v.split(' ').sort().join(' ') : v
  }
  return out
}
