import AsyncStorage from '@react-native-async-storage/async-storage'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

const BACKUP_KEYS = ['@shopping_list', '@active_shopping', '@shopping_history', '@app_theme', '@accent_color', '@saved_colors'] as const

export interface BackupData {
  version: 1
  timestamp: string
  data: Record<string, string | null>
}

export async function createAndShareBackup(): Promise<void> {
  const data: Record<string, string | null> = {}
  for (const key of BACKUP_KEYS) {
    data[key] = await AsyncStorage.getItem(key)
  }
  const backup: BackupData = {
    version: 1,
    timestamp: new Date().toISOString(),
    data,
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const fileName = `1goshop-backup-${dateStr}.json`
  const file = new File(Paths.cache, fileName)

  if (file.exists) {
    file.delete()
  }
  file.create()
  file.write(JSON.stringify(backup, null, 2))

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: '1GoShop Backup',
    UTI: 'public.json',
  })
}

export async function restoreFromFile(): Promise<boolean> {
  const result = await File.pickFileAsync(undefined, 'application/json')
  if (!result) return false

  const pickedFile = Array.isArray(result) ? result[0] : result
  if (!pickedFile) return false

  try {
    const content = await pickedFile.text()
    return restoreBackup(content)
  } catch (error) {
    console.warn('[BackupService] Failed to read backup file:', error)
    return false
  }
}

const MAX_BACKUP_SIZE = 10 * 1024 * 1024 // 10MB

function isValidBackupData(data: unknown): data is BackupData {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  if (obj.version !== 1) return false
  if (typeof obj.data !== 'object' || obj.data === null) return false
  return true
}

export async function restoreBackup(jsonString: string): Promise<boolean> {
  try {
    if (jsonString.length > MAX_BACKUP_SIZE) {
      console.warn('[BackupService] Backup too large:', jsonString.length)
      return false
    }
    const backup: unknown = JSON.parse(jsonString)
    if (!isValidBackupData(backup)) {
      console.warn('[BackupService] Invalid backup structure')
      return false
    }
    const results = await Promise.allSettled(
      Object.entries(backup.data).map(([key, value]) =>
        value !== null ? AsyncStorage.setItem(key, value) : AsyncStorage.removeItem(key),
      ),
    )
    const failures = results.filter((r) => r.status === 'rejected')
    if (failures.length > 0) {
      console.warn('[BackupService] Partial restore failure:', failures)
      return false
    }
    return true
  } catch (error) {
    console.warn('[BackupService] Failed to restore backup:', error)
    return false
  }
}
