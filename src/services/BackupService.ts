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
  } catch {
    return false
  }
}

export function restoreBackup(jsonString: string): boolean {
  try {
    const backup = JSON.parse(jsonString) as BackupData
    if (!backup.version || !backup.data) {
      return false
    }
    for (const [key, value] of Object.entries(backup.data)) {
      if (value !== null) {
        void AsyncStorage.setItem(key, value)
      } else {
        void AsyncStorage.removeItem(key)
      }
    }
    return true
  } catch {
    return false
  }
}
