import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert } from 'react-native'
import { randomUUID } from 'expo-crypto'
import i18n from '../i18n/i18n'
import type { ShoppingItem } from '../types/shopping'
import { debouncedPersist } from '../services/debouncedPersist'
import { debugLog } from '../services/DebugLogger'
import { useListsMetaStore } from './ListsMetaStore'
import {
  firebaseSetItems,
  firebaseAddItem,
  firebaseUpdateItem,
  firebaseBatchUpdateOrder,
  firebaseBatchUncheckItems,
  firebaseRemoveItemsAndReorder,
  firebaseUpdateListName,
  subscribeToList,
  unsubscribeFromList,
  type FirebaseListMeta,
} from '../services/FirebaseSyncService'
import { useActiveShoppingStore } from './ActiveShoppingStore'

export interface ShoppingListStoreState {
  items: ShoppingItem[]
  isLoaded: boolean
  currentListId: string | null

  load: () => Promise<void>
  switchToList: (listId: string) => Promise<void>
  addItem: (name: string) => void
  removeItem: (id: string) => void
  toggleChecked: (id: string) => void
  editItem: (id: string, name: string) => void
  incrementQuantity: (id: string) => void
  decrementQuantity: (id: string) => void
  reorderItems: (fromIndex: number, toIndex: number) => void
  setItems: (items: ShoppingItem[]) => void
  uncheckItems: (ids: string[]) => void
  clearChecked: () => void
  clearAll: () => void
  setItemsFromFirebase: (items: ShoppingItem[]) => void
}

let currentFirebaseUnsub: (() => void) | null = null

export const useShoppingListStore = create<ShoppingListStoreState>((set, get) => ({
  items: [],
  isLoaded: false,
  currentListId: null,

  load: async () => {
    set({ isLoaded: true })
  },

  switchToList: async (listId: string) => {
    debugLog('Store', `switchToList called: ${listId}`)

    // Unsubscribe from previous Firebase listener
    if (currentFirebaseUnsub) {
      debugLog('Store', 'Unsubscribing from previous listener')
      currentFirebaseUnsub()
      currentFirebaseUnsub = null
    }

    const listMeta = useListsMetaStore.getState().lists.find((l) => l.id === listId)
    debugLog('Store', `listMeta: isShared=${listMeta?.isShared}, firebaseListId=${listMeta?.firebaseListId ?? 'null'}`)

    // Always load local data first as immediate fallback
    const key = `@list_${listId}_items`
    let localItems: ShoppingItem[] = []
    try {
      const saved = await AsyncStorage.getItem(key)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          localItems = (parsed as ShoppingItem[])
            .sort((a, b) => a.order - b.order)
            .map((item, i) => ({ ...item, order: i }))
        }
      }
      debugLog('Store', `Local items loaded: ${localItems.length}`)
    } catch (error) {
      debugLog('Store', `Failed to load local items: ${error}`)
      console.warn('[ShoppingListStore] Failed to load local items:', error)
    }

    // Show local data immediately
    set({ items: localItems, currentListId: listId, isLoaded: true })

    // If shared, also subscribe to Firebase — will override local data when it arrives
    if (listMeta?.isShared && listMeta.firebaseListId) {
      debugLog('Store', `List is shared — subscribing to Firebase: ${listMeta.firebaseListId}`)
      // Guard against stale async: if switchToList was called again while we were loading local data,
      // currentListId has moved on — don't subscribe and leave the newer call's listener intact
      if (get().currentListId !== listId) {
        debugLog('Store', `switchToList: stale call for ${listId}, currentListId=${get().currentListId ?? 'null'}, aborting subscribe`)
        return
      }
      currentFirebaseUnsub = subscribeToList(listMeta.firebaseListId, {
        onItems: (items) => {
          const isCurrentList = get().currentListId === listId
          debugLog('Store', `onItems callback: ${items.length} items, isCurrentList=${isCurrentList}`)
          if (isCurrentList) {
            set({ items })
            // Also persist to local storage as cache
            debouncedPersist(key, items)
          }
        },
        onSession: (session) => {
          if (get().currentListId === listId) {
            debugLog('Store', `onSession callback: session=${session ? 'active' : 'null'}`)
            useActiveShoppingStore.getState().setSessionFromFirebase(session)
          }
        },
        onMeta: (meta) => {
          if (get().currentListId === listId) {
            debugLog('Store', `onMeta callback: name="${meta.name}"`)
            // Sync list name from Firebase to local meta
            const currentMeta = useListsMetaStore.getState().lists.find((l) => l.id === listId)
            if (currentMeta && currentMeta.name !== meta.name) {
              useListsMetaStore.getState().renameList(listId, meta.name)
            }
          }
        },
      })
    } else {
      debugLog('Store', 'List is NOT shared — local only')
    }
  },

  addItem: (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    const items = get().items
    const newItem: ShoppingItem = {
      id: randomUUID(),
      name: trimmed,
      quantity: 1,
      isChecked: true,
      order: items.length,
      createdAt: new Date().toISOString(),
    }
    const fbId = getFirebaseListId(get().currentListId)
    debugLog('Store', `addItem: "${trimmed}", fbId=${fbId ?? 'null (local)'}`)
    if (fbId) {
      // Zdieľaný: len Firebase write — UI update príde cez onItems listener echo
      firebaseAddItem(fbId, newItem).catch(logFirebaseError)
    } else {
      const updated = [...items, newItem]
      set({ items: updated })
      persistLocal(updated, get().currentListId)
    }
  },

  removeItem: (id: string) => {
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      // Zdieľaný: len Firebase write — listener echo aktualizuje UI
      const remaining = get().items.filter((item) => item.id !== id).map((item, i) => ({ ...item, order: i }))
      firebaseRemoveItemsAndReorder(fbId, [id], remaining).catch(logFirebaseError)
    } else {
      const updated = get().items.filter((item) => item.id !== id).map((item, i) => ({ ...item, order: i }))
      set({ items: updated })
      persistLocal(updated, get().currentListId)
    }
  },

  toggleChecked: (id: string) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    const newChecked = !item.isChecked
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      // Zdieľaný: len Firebase write — listener echo aktualizuje UI
      firebaseUpdateItem(fbId, id, { isChecked: newChecked }).catch(logFirebaseError)
    } else {
      const updated = get().items.map((i) => i.id === id ? { ...i, isChecked: newChecked } : i)
      set({ items: updated })
      persistLocal(updated, get().currentListId)
    }
  },

  editItem: (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      // Zdieľaný: len Firebase write — listener echo aktualizuje UI
      firebaseUpdateItem(fbId, id, { name: trimmed }).catch(logFirebaseError)
    } else {
      const updated = get().items.map((item) => item.id === id ? { ...item, name: trimmed } : item)
      set({ items: updated })
      persistLocal(updated, get().currentListId)
    }
  },

  incrementQuantity: (id: string) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    const newQty = item.quantity + 1
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      // Zdieľaný: len Firebase write — listener echo aktualizuje UI
      firebaseUpdateItem(fbId, id, { quantity: newQty }).catch(logFirebaseError)
    } else {
      const updated = get().items.map((i) => i.id === id ? { ...i, quantity: newQty } : i)
      set({ items: updated })
      persistLocal(updated, get().currentListId)
    }
  },

  decrementQuantity: (id: string) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    const newQty = Math.max(1, item.quantity - 1)
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      // Zdieľaný: len Firebase write — listener echo aktualizuje UI
      firebaseUpdateItem(fbId, id, { quantity: newQty }).catch(logFirebaseError)
    } else {
      const updated = get().items.map((i) => i.id === id ? { ...i, quantity: newQty } : i)
      set({ items: updated })
      persistLocal(updated, get().currentListId)
    }
  },

  reorderItems: (fromIndex: number, toIndex: number) => {
    const items = [...get().items]
    const moved = items[fromIndex]
    if (!moved) return
    items.splice(fromIndex, 1)
    items.splice(toIndex, 0, moved)
    const updated = items.map((item, i) => ({ ...item, order: i }))
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      // Zdieľaný: optimistický update pre plynulý drag UX + Firebase write
      // Reorder je vizuálna akcia — okamžitá odozva je dôležitá pre UX
      set({ items: updated })
      firebaseBatchUpdateOrder(fbId, updated).catch(logFirebaseError)
    } else {
      set({ items: updated })
      persistLocal(updated, get().currentListId)
    }
  },

  setItems: (items: ShoppingItem[]) => {
    set({ items })
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      firebaseSetItems(fbId, items).catch(logFirebaseError)
    } else {
      persistLocal(items, get().currentListId)
    }
  },

  uncheckItems: (ids: string[]) => {
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      // Zdieľaný: len Firebase write — listener echo aktualizuje UI
      firebaseBatchUncheckItems(fbId, ids).catch(logFirebaseError)
    } else {
      const idSet = new Set(ids)
      const updated = get().items.map((item) => idSet.has(item.id) ? { ...item, isChecked: false } : item)
      set({ items: updated })
      persistLocal(updated, get().currentListId)
    }
  },

  clearChecked: () => {
    const checkedIds = get().items.filter((item) => item.isChecked).map((item) => item.id)
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      // Zdieľaný: len Firebase write — listener echo aktualizuje UI
      const remaining = get().items.filter((item) => !item.isChecked).map((item, i) => ({ ...item, order: i }))
      firebaseRemoveItemsAndReorder(fbId, checkedIds, remaining).catch(logFirebaseError)
    } else {
      const updated = get().items.filter((item) => !item.isChecked).map((item, i) => ({ ...item, order: i }))
      set({ items: updated })
      persistLocal(updated, get().currentListId)
    }
  },

  clearAll: () => {
    const allIds = get().items.map((item) => item.id)
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      // Zdieľaný: len Firebase write — listener echo aktualizuje UI
      firebaseRemoveItemsAndReorder(fbId, allIds, []).catch(logFirebaseError)
    } else {
      set({ items: [] })
      persistLocal([], get().currentListId)
    }
  },

  setItemsFromFirebase: (items: ShoppingItem[]) => {
    set({ items })
  },
}))

function getFirebaseListId(listId: string | null): string | null {
  if (!listId) return null
  const listMeta = useListsMetaStore.getState().lists.find((l) => l.id === listId)
  if (listMeta?.isShared && listMeta.firebaseListId) return listMeta.firebaseListId
  return null
}

function persistLocal(items: ShoppingItem[], listId: string | null): void {
  if (!listId) return
  debouncedPersist(`@list_${listId}_items`, items)
}

let lastOfflineAlertAt = 0
const OFFLINE_ALERT_COOLDOWN_MS = 60_000

function logFirebaseError(e: unknown): void {
  const msg = e instanceof Error ? e.message : String(e)
  debugLog('Store', `Firebase operation FAILED: ${msg}`)
  console.warn('[ShoppingListStore] Firebase operation failed:', msg)

  // Pre zdieľané listy: NEVOLÁME persistLocal — Firebase je jediný zdroj pravdy.
  // Lokálny stav je len cache z Firebase listenera, nie authoritative stav.

  const now = Date.now()
  if (now - lastOfflineAlertAt > OFFLINE_ALERT_COOLDOWN_MS) {
    lastOfflineAlertAt = now
    Alert.alert(
      i18n.t('Sharing.offlineTitle'),
      i18n.t('Sharing.offlineWarning'),
    )
  }
}
