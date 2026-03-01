// In-memory debug log visible in the app UI.
// Keeps last 200 entries so we can inspect sync flow on a real device.

export interface LogEntry {
  time: string
  tag: string
  message: string
}

const MAX_ENTRIES = 200
const entries: LogEntry[] = []
const listeners: Set<() => void> = new Set()

export function debugLog(tag: string, message: string): void {
  const now = new Date()
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad3(now.getMilliseconds())}`
  const entry: LogEntry = { time, tag, message }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries.shift()
  console.log(`[${tag}] ${message}`)
  for (const listener of listeners) listener()
}

export function getDebugLogs(): LogEntry[] {
  return entries
}

export function clearDebugLogs(): void {
  entries.length = 0
  for (const listener of listeners) listener()
}

export function subscribeDebugLogs(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function pad3(n: number): string {
  if (n < 10) return `00${n}`
  if (n < 100) return `0${n}`
  return String(n)
}
