export const tabId = (instanceId: string, value: string) => `${instanceId}-tab-${value}`
export const panelId = (instanceId: string, value: string) => `${instanceId}-panel-${value}`

// Solid renders to DOM nodes, not VNodes — children matching uses element type
export const isType =
  (type: unknown) =>
  (child: unknown): boolean => {
    if (typeof child !== 'object' || child === null) return false
    // Solid wraps components in a memo; the type is on the underlying function
    return (child as { type?: unknown }).type === type
  }
