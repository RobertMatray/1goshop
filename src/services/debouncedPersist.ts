import AsyncStorage from '@react-native-async-storage/async-storage'

const timers = new Map<string, ReturnType<typeof setTimeout>>()
const pendingData = new Map<string, unknown>()

/**
 * Debounced AsyncStorage write. Batches rapid changes into a single write.
 * Waits `delay` ms after the last call before writing.
 */
export function debouncedPersist(key: string, data: unknown, delay = 150): void {
  pendingData.set(key, data)

  const existing = timers.get(key)
  if (existing) clearTimeout(existing)

  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key)
      const finalData = pendingData.get(key)
      pendingData.delete(key)
      if (finalData !== undefined) {
        AsyncStorage.setItem(key, JSON.stringify(finalData)).catch((e) =>
          console.warn(`[debouncedPersist] Failed to persist ${key}:`, e),
        )
      }
    }, delay),
  )
}

/**
 * Immediately flush any pending debounced write for the given key.
 * Used for critical operations like backup restore where data must be written before continuing.
 */
export async function flushPersist(key: string): Promise<void> {
  const timer = timers.get(key)
  if (timer) {
    clearTimeout(timer)
    timers.delete(key)
  }
  const data = pendingData.get(key)
  if (data !== undefined) {
    pendingData.delete(key)
    await AsyncStorage.setItem(key, JSON.stringify(data))
  }
}
