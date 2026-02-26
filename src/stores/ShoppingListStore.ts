import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import type { ShoppingItem } from '../types/shopping'
import { debouncedPersist } from '../services/debouncedPersist'
import { useListsMetaStore } from './ListsMetaStore'
import {
  firebaseSetItems,
  subscribeToList,
  unsubscribeFromList,
} from '../services/FirebaseSyncService'

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
        onSession: () => {},
        onMeta: () => {},
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
    persist(updated, get().currentListId)
  },

  removeItem: (id: string) => {
    const updated = get()
      .items.filter((item) => item.id !== id)
      .map((item, i) => ({ ...item, order: i }))
    set({ items: updated })
    persist(updated, get().currentListId)
  },

  toggleChecked: (id: string) => {
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, isChecked: !item.isChecked } : item,
    )
    set({ items: updated })
    persist(updated, get().currentListId)
  },

  editItem: (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, name: trimmed } : item,
    )
    set({ items: updated })
    persist(updated, get().currentListId)
  },

  incrementQuantity: (id: string) => {
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
    )
    set({ items: updated })
    persist(updated, get().currentListId)
  },

  decrementQuantity: (id: string) => {
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item,
    )
    set({ items: updated })
    persist(updated, get().currentListId)
  },

  reorderItems: (fromIndex: number, toIndex: number) => {
    const items = [...get().items]
    const moved = items[fromIndex]
    if (!moved) return
    items.splice(fromIndex, 1)
    items.splice(toIndex, 0, moved)
    const updated = items.map((item, i) => ({ ...item, order: i }))
    set({ items: updated })
    persist(updated, get().currentListId)
  },

  setItems: (items: ShoppingItem[]) => {
    set({ items })
    persist(items, get().currentListId)
  },

  uncheckItems: (ids: string[]) => {
    const idSet = new Set(ids)
    const updated = get().items.map((item) =>
      idSet.has(item.id) ? { ...item, isChecked: false } : item,
    )
    set({ items: updated })
    persist(updated, get().currentListId)
  },

  clearChecked: () => {
    const updated = get()
      .items.filter((item) => !item.isChecked)
      .map((item, i) => ({ ...item, order: i }))
    set({ items: updated })
    persist(updated, get().currentListId)
  },

  clearAll: () => {
    set({ items: [] })
    persist([], get().currentListId)
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

function persist(items: ShoppingItem[], listId: string | null): void {
  if (!listId) return
  const firebaseListId = getFirebaseListId(listId)
  if (firebaseListId) {
    firebaseSetItems(firebaseListId, items).catch((e) =>
      console.warn('[ShoppingListStore] Firebase persist failed:', e),
    )
  } else {
    debouncedPersist(`@list_${listId}_items`, items)
  }
}
