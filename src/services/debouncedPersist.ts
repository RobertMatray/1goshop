import AsyncStorage from '@react-native-async-storage/async-storage'

const timers = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Debounced AsyncStorage write. Batches rapid changes into a single write.
 * Waits `delay` ms after the last call before writing.
 */
export function debouncedPersist(key: string, data: unknown, delay = 150): void {
  const existing = timers.get(key)
  if (existing) clearTimeout(existing)

  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key)
      AsyncStorage.setItem(key, JSON.stringify(data)).catch((e) =>
        console.warn(`[debouncedPersist] Failed to persist ${key}:`, e),
      )
    }, delay),
  )
}
