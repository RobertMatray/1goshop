import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import type { ShoppingItem } from '../types/shopping'
import { debouncedPersist } from '../services/debouncedPersist'
import { useListsMetaStore } from './ListsMetaStore'
import {
  firebaseSetItems,
  firebaseAddItem,

  firebaseUpdateItem,
  firebaseBatchUpdateOrder,
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
    // Unsubscribe from previous Firebase listener
    if (currentFirebaseUnsub) {
      currentFirebaseUnsub()
      currentFirebaseUnsub = null
    }

    const listMeta = useListsMetaStore.getState().lists.find((l) => l.id === listId)

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
    } catch (error) {
      console.warn('[ShoppingListStore] Failed to load local items:', error)
    }

    // Show local data immediately
    set({ items: localItems, currentListId: listId, isLoaded: true })

    // If shared, also subscribe to Firebase — will override local data when it arrives
    if (listMeta?.isShared && listMeta.firebaseListId) {
      currentFirebaseUnsub = subscribeToList(listMeta.firebaseListId, {
        onItems: (items) => {
          if (get().currentListId === listId) {
            set({ items })
            // Also persist to local storage as cache
            debouncedPersist(key, items)
          }
        },
        onSession: (session) => {
          if (get().currentListId === listId) {
            useActiveShoppingStore.getState().setSessionFromFirebase(session)
          }
        },
        onMeta: (meta) => {
          if (get().currentListId === listId) {
            // Sync list name from Firebase to local meta
            const currentMeta = useListsMetaStore.getState().lists.find((l) => l.id === listId)
            if (currentMeta && currentMeta.name !== meta.name) {
              useListsMetaStore.getState().renameList(listId, meta.name)
            }
          }
        },
      })
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
    const updated = [...items, newItem]
    set({ items: updated })
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      firebaseAddItem(fbId, newItem).catch(logFirebaseError)
    } else {
      persistLocal(updated, get().currentListId)
    }
  },

  removeItem: (id: string) => {
    const updated = get()
      .items.filter((item) => item.id !== id)
      .map((item, i) => ({ ...item, order: i }))
    set({ items: updated })
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      firebaseRemoveItemsAndReorder(fbId, [id], updated).catch(logFirebaseError)
    } else {
      persistLocal(updated, get().currentListId)
    }
  },

  toggleChecked: (id: string) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    const newChecked = !item.isChecked
    const updated = get().items.map((i) =>
      i.id === id ? { ...i, isChecked: newChecked } : i,
    )
    set({ items: updated })
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      firebaseUpdateItem(fbId, id, { isChecked: newChecked }).catch(logFirebaseError)
    } else {
      persistLocal(updated, get().currentListId)
    }
  },

  editItem: (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, name: trimmed } : item,
    )
    set({ items: updated })
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      firebaseUpdateItem(fbId, id, { name: trimmed }).catch(logFirebaseError)
    } else {
      persistLocal(updated, get().currentListId)
    }
  },

  incrementQuantity: (id: string) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    const newQty = item.quantity + 1
    const updated = get().items.map((i) =>
      i.id === id ? { ...i, quantity: newQty } : i,
    )
    set({ items: updated })
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      firebaseUpdateItem(fbId, id, { quantity: newQty }).catch(logFirebaseError)
    } else {
      persistLocal(updated, get().currentListId)
    }
  },

  decrementQuantity: (id: string) => {
    const item = get().items.find((i) => i.id === id)
    if (!item) return
    const newQty = Math.max(1, item.quantity - 1)
    const updated = get().items.map((i) =>
      i.id === id ? { ...i, quantity: newQty } : i,
    )
    set({ items: updated })
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      firebaseUpdateItem(fbId, id, { quantity: newQty }).catch(logFirebaseError)
    } else {
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
    set({ items: updated })
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      firebaseBatchUpdateOrder(fbId, updated).catch(logFirebaseError)
    } else {
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
    const idSet = new Set(ids)
    const updated = get().items.map((item) =>
      idSet.has(item.id) ? { ...item, isChecked: false } : item,
    )
    set({ items: updated })
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      for (const id of ids) {
        firebaseUpdateItem(fbId, id, { isChecked: false }).catch(logFirebaseError)
      }
    } else {
      persistLocal(updated, get().currentListId)
    }
  },

  clearChecked: () => {
    const checkedIds = get().items.filter((item) => item.isChecked).map((item) => item.id)
    const updated = get()
      .items.filter((item) => !item.isChecked)
      .map((item, i) => ({ ...item, order: i }))
    set({ items: updated })
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      firebaseRemoveItemsAndReorder(fbId, checkedIds, updated).catch(logFirebaseError)
    } else {
      persistLocal(updated, get().currentListId)
    }
  },

  clearAll: () => {
    const allIds = get().items.map((item) => item.id)
    set({ items: [] })
    const fbId = getFirebaseListId(get().currentListId)
    if (fbId) {
      firebaseRemoveItemsAndReorder(fbId, allIds, []).catch(logFirebaseError)
    } else {
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

function logFirebaseError(e: unknown): void {
  console.warn('[ShoppingListStore] Firebase operation failed:', e)
}
