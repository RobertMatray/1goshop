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
 * Idempotent — safe to call multiple times.
 * Also recovers orphaned old-format data if migration previously ran incomplete.
 */
export async function migrateToMultiList(): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(META_KEY)

    if (existing) {
      // Migration already ran — but check for orphaned old keys that weren't migrated
      await recoverOrphanedData(existing)
      return
    }

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

/**
 * Recovers data from old single-list keys that weren't properly migrated.
 * This handles the case where @lists_meta was created but old data wasn't copied.
 */
async function recoverOrphanedData(metaRaw: string): Promise<void> {
  try {
    const meta = JSON.parse(metaRaw) as ListsMetaData
    const firstList = meta.lists[0]
    if (!firstList) return

    const listId = firstList.id
    const oldResults = await AsyncStorage.multiGet([OLD_LIST_KEY, OLD_SESSION_KEY, OLD_HISTORY_KEY])
    const oldList = oldResults[0]?.[1] ?? null
    const oldSession = oldResults[1]?.[1] ?? null
    const oldHistory = oldResults[2]?.[1] ?? null

    if (!oldList && !oldSession && !oldHistory) return

    console.log('[MigrationService] Found orphaned old data, recovering...')

    const writes: [string, string][] = []
    const removes: string[] = []

    if (oldList) {
      const existing = await AsyncStorage.getItem(`@list_${listId}_items`)
      if (!existing) {
        writes.push([`@list_${listId}_items`, oldList])
      }
      removes.push(OLD_LIST_KEY)
    }

    if (oldSession) {
      const existing = await AsyncStorage.getItem(`@list_${listId}_session`)
      if (!existing) {
        writes.push([`@list_${listId}_session`, oldSession])
      }
      removes.push(OLD_SESSION_KEY)
    }

    if (oldHistory) {
      const existing = await AsyncStorage.getItem(`@list_${listId}_history`)
      if (!existing) {
        writes.push([`@list_${listId}_history`, oldHistory])
      }
      removes.push(OLD_HISTORY_KEY)
    }

    if (writes.length > 0) {
      await AsyncStorage.multiSet(writes)
      console.log('[MigrationService] Recovered', writes.length, 'orphaned data keys')
    }

    if (removes.length > 0) {
      await AsyncStorage.multiRemove(removes).catch((e) =>
        console.warn('[MigrationService] Failed to clean orphaned keys:', e),
      )
    }
  } catch (error) {
    console.warn('[MigrationService] Recovery failed:', error)
  }
}
