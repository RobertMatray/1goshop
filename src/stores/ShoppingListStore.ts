import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import type { ShoppingItem } from '../types/shopping'

const STORAGE_KEY = '@shopping_list'

export interface ShoppingListStoreState {
  items: ShoppingItem[]
  isLoaded: boolean

  load: () => Promise<void>
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
}

export const useShoppingListStore = create<ShoppingListStoreState>((set, get) => ({
  items: [],
  isLoaded: false,

  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as ShoppingItem[]
        const items = parsed
          .sort((a, b) => a.order - b.order)
          .map((item, i) => ({ ...item, order: i }))
        set({ items, isLoaded: true })
        persist(items)
      } else {
        set({ isLoaded: true })
      }
    } catch (error) {
      console.warn('[ShoppingListStore] Failed to load items:', error)
      set({ isLoaded: true })
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
    persist(updated)
  },

  removeItem: (id: string) => {
    const updated = get()
      .items.filter((item) => item.id !== id)
      .map((item, i) => ({ ...item, order: i }))
    set({ items: updated })
    persist(updated)
  },

  toggleChecked: (id: string) => {
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, isChecked: !item.isChecked } : item,
    )
    set({ items: updated })
    persist(updated)
  },

  editItem: (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, name: trimmed } : item,
    )
    set({ items: updated })
    persist(updated)
  },

  incrementQuantity: (id: string) => {
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
    )
    set({ items: updated })
    persist(updated)
  },

  decrementQuantity: (id: string) => {
    const updated = get().items.map((item) =>
      item.id === id && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item,
    )
    set({ items: updated })
    persist(updated)
  },

  reorderItems: (fromIndex: number, toIndex: number) => {
    const items = [...get().items]
    const moved = items[fromIndex]
    if (!moved) return
    items.splice(fromIndex, 1)
    items.splice(toIndex, 0, moved)
    const updated = items.map((item, i) => ({ ...item, order: i }))
    set({ items: updated })
    persist(updated)
  },

  setItems: (items: ShoppingItem[]) => {
    set({ items })
    persist(items)
  },

  uncheckItems: (ids: string[]) => {
    const idSet = new Set(ids)
    const updated = get().items.map((item) =>
      idSet.has(item.id) ? { ...item, isChecked: false } : item,
    )
    set({ items: updated })
    persist(updated)
  },

  clearChecked: () => {
    const updated = get()
      .items.filter((item) => !item.isChecked)
      .map((item, i) => ({ ...item, order: i }))
    set({ items: updated })
    persist(updated)
  },

  clearAll: () => {
    set({ items: [] })
    persist([])
  },
}))

function persist(items: ShoppingItem[]): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch((e) => console.warn('[ShoppingListStore] Failed to persist items:', e))
}
