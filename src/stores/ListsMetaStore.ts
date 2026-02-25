import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import type { ShoppingListMeta, ListsMetaData } from '../types/shopping'

const STORAGE_KEY = '@lists_meta'

export interface ListsMetaStoreState {
  lists: ShoppingListMeta[]
  selectedListId: string | null
  deviceId: string
  isLoaded: boolean

  load: () => Promise<void>
  createList: (name: string) => string
  renameList: (id: string, name: string) => void
  deleteList: (id: string) => Promise<void>
  selectList: (id: string) => void
  markListAsShared: (id: string, firebaseListId: string, shareCode: string) => void
  unlinkList: (id: string) => void
  getSelectedList: () => ShoppingListMeta | undefined
}

export const useListsMetaStore = create<ListsMetaStoreState>((set, get) => ({
  lists: [],
  selectedListId: null,
  deviceId: '',
  isLoaded: false,

  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (typeof parsed !== 'object' || parsed === null || !('version' in parsed)) {
          console.warn('[ListsMetaStore] Invalid meta data, clearing')
          await AsyncStorage.removeItem(STORAGE_KEY)
          set({ isLoaded: true })
          return
        }
        const data = parsed as ListsMetaData
        set({
          lists: data.lists,
          selectedListId: data.selectedListId,
          deviceId: data.deviceId,
          isLoaded: true,
        })
      } else {
        set({ isLoaded: true })
      }
    } catch (error) {
      console.warn('[ListsMetaStore] Failed to load:', error)
      set({ isLoaded: true })
    }
  },

  createList: (name: string) => {
    const id = randomUUID()
    const newList: ShoppingListMeta = {
      id,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      isShared: false,
      shareCode: null,
      firebaseListId: null,
      ownerDeviceId: get().deviceId,
    }
    const updated = [...get().lists, newList]
    set({ lists: updated, selectedListId: id })
    persist(get())
    return id
  },

  renameList: (id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const updated = get().lists.map((l) => (l.id === id ? { ...l, name: trimmed } : l))
    set({ lists: updated })
    persist(get())
  },

  deleteList: async (id: string) => {
    const { lists, selectedListId } = get()
    if (lists.length <= 1) return

    const updated = lists.filter((l) => l.id !== id)
    const newSelectedId = selectedListId === id ? updated[0]?.id ?? null : selectedListId
    set({ lists: updated, selectedListId: newSelectedId })
    persist(get())

    await AsyncStorage.multiRemove([
      `@list_${id}_items`,
      `@list_${id}_session`,
      `@list_${id}_history`,
    ]).catch((e) => console.warn('[ListsMetaStore] Failed to remove list data:', e))
  },

  selectList: (id: string) => {
    set({ selectedListId: id })
    persist(get())
  },

  markListAsShared: (id: string, firebaseListId: string, shareCode: string) => {
    const updated = get().lists.map((l) =>
      l.id === id ? { ...l, isShared: true, firebaseListId, shareCode } : l,
    )
    set({ lists: updated })
    persist(get())
  },

  unlinkList: (id: string) => {
    const updated = get().lists.map((l) =>
      l.id === id ? { ...l, isShared: false, firebaseListId: null, shareCode: null } : l,
    )
    set({ lists: updated })
    persist(get())
  },

  getSelectedList: () => {
    const { lists, selectedListId } = get()
    return lists.find((l) => l.id === selectedListId)
  },
}))

function persist(state: ListsMetaStoreState): void {
  const data: ListsMetaData = {
    version: 1,
    lists: state.lists,
    selectedListId: state.selectedListId ?? '',
    deviceId: state.deviceId,
  }
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((e) =>
    console.warn('[ListsMetaStore] Failed to persist:', e),
  )
}
