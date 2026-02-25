import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import i18n from '../i18n/i18n'
import type { ListsMetaData, ShoppingListMeta } from '../types/shopping'

const META_KEY = '@lists_meta'
const OLD_LIST_KEY = '@shopping_list'
const OLD_SESSION_KEY = '@active_shopping'
const OLD_HISTORY_KEY = '@shopping_history'

/**
 * Migrates from single-list storage format to multi-list format.
 * Idempotent — safe to call multiple times. Skips if already migrated.
 */
export async function migrateToMultiList(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(META_KEY)
    if (existing) return

    const results = await AsyncStorage.multiGet([
      OLD_LIST_KEY,
      OLD_SESSION_KEY,
      OLD_HISTORY_KEY,
    ])

    const listValue = results[0]?.[1] ?? null
    const sessionValue = results[1]?.[1] ?? null
    const historyValue = results[2]?.[1] ?? null
    const hasData = listValue || sessionValue || historyValue

    const listId = randomUUID()
    const deviceId = randomUUID()
    const defaultName = i18n.t('Lists.defaultListName')

    const meta: ShoppingListMeta = {
      id: listId,
      name: defaultName,
      createdAt: new Date().toISOString(),
      isShared: false,
      shareCode: null,
      firebaseListId: null,
      ownerDeviceId: deviceId,
    }

    const metaData: ListsMetaData = {
      version: 1,
      lists: [meta],
      selectedListId: listId,
      deviceId,
    }

    const writes: [string, string][] = [[META_KEY, JSON.stringify(metaData)]]

    if (hasData) {
      if (listValue) {
        writes.push([`@list_${listId}_items`, listValue])
      }
      if (sessionValue) {
        writes.push([`@list_${listId}_session`, sessionValue])
      }
      if (historyValue) {
        writes.push([`@list_${listId}_history`, historyValue])
      }
    }

    await AsyncStorage.multiSet(writes)

    if (hasData) {
      await AsyncStorage.multiRemove([OLD_LIST_KEY, OLD_SESSION_KEY, OLD_HISTORY_KEY]).catch((e) =>
        console.warn('[MigrationService] Failed to remove old keys:', e),
      )
    }

    console.log('[MigrationService] Migration complete, list:', listId)
  } catch (error) {
    console.warn('[MigrationService] Migration failed:', error)
  }
}
