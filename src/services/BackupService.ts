import AsyncStorage from '@react-native-async-storage/async-storage'

const BACKUP_KEYS = ['@shopping_list', '@active_shopping', '@shopping_history', '@app_theme'] as const

export interface BackupData {
  version: 1
  timestamp: string
  data: Record<string, string | null>
}

export async function createBackup(): Promise<string> {
  const data: Record<string, string | null> = {}
  for (const key of BACKUP_KEYS) {
    data[key] = await AsyncStorage.getItem(key)
  }
  const backup: BackupData = {
    version: 1,
    timestamp: new Date().toISOString(),
    data,
  }
  return JSON.stringify(backup)
}

export async function restoreBackup(jsonString: string): Promise<boolean> {
  try {
    const backup = JSON.parse(jsonString) as BackupData
    if (!backup.version || !backup.data) {
      return false
    }
    for (const [key, value] of Object.entries(backup.data)) {
      if (value !== null) {
        await AsyncStorage.setItem(key, value)
      } else {
        await AsyncStorage.removeItem(key)
      }
    }
    return true
  } catch {
    return false
  }
}
