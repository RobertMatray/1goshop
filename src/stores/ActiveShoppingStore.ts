import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import type { ShoppingItem, ActiveShoppingItem, ShoppingSession } from '../types/shopping'
import { debouncedPersist } from '../services/debouncedPersist'
import { useListsMetaStore } from './ListsMetaStore'
import {
  firebaseSetSession,
  firebaseAddHistory,
  firebaseRemoveHistory,
  firebaseClearHistory,
  firebaseLoadHistory,
} from '../services/FirebaseSyncService'

export interface ActiveShoppingStoreState {
  session: ShoppingSession | null
  showBought: boolean
  isLoaded: boolean
  isFinishing: boolean
  history: ShoppingSession[]
  currentListId: string | null

  load: () => Promise<void>
  switchToList: (listId: string) => Promise<void>
  loadHistory: () => Promise<void>
  startShopping: (items: ShoppingItem[]) => void
  toggleBought: (id: string) => void
  toggleShowBought: () => void
  finishShopping: () => Promise<void>
  removeSession: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
  setSessionFromFirebase: (session: ShoppingSession | null) => void
}

export const useActiveShoppingStore = create<ActiveShoppingStoreState>((set, get) => ({
  session: null,
  showBought: true,
  isLoaded: false,
  isFinishing: false,
  history: [],
  currentListId: null,

  load: async () => {
    set({ isLoaded: true })
  },

  switchToList: async (listId: string) => {
    const sessionKey = `@list_${listId}_session`
    try {
      const saved = await AsyncStorage.getItem(sessionKey)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (typeof parsed !== 'object' || parsed === null || !('id' in parsed)) {
          console.warn('[ActiveShoppingStore] Invalid session data for list', listId)
          set({ session: null, currentListId: listId, isLoaded: true })
          return
        }
        set({ session: parsed as ShoppingSession, currentListId: listId, isLoaded: true })
      } else {
        set({ session: null, currentListId: listId, isLoaded: true })
      }
    } catch (error) {
      console.warn('[ActiveShoppingStore] Failed to load session for list:', listId, error)
      set({ session: null, currentListId: listId, isLoaded: true })
    }
  },

  loadHistory: async () => {
    const { currentListId } = get()
    if (!currentListId) return

    const firebaseListId = getFirebaseListId(currentListId)
    if (firebaseListId) {
      try {
        const history = await firebaseLoadHistory(firebaseListId)
        if (history.length > 0) {
          set({ history })
          return
        }
      } catch (error) {
        console.warn('[ActiveShoppingStore] Failed to load Firebase history:', error)
      }
      // Fallback to local storage if Firebase has no history
    }

    const historyKey = `@list_${currentListId}_history`
    try {
      let historyRaw = await AsyncStorage.getItem(historyKey)

      // Fallback: recover history from old single-list key if migration missed it
      if (!historyRaw) {
        const oldHistoryRaw = await AsyncStorage.getItem('@shopping_history')
        if (oldHistoryRaw) {
          console.log('[ActiveShoppingStore] Recovering history from old key')
          await AsyncStorage.setItem(historyKey, oldHistoryRaw)
          await AsyncStorage.removeItem('@shopping_history')
          historyRaw = oldHistoryRaw
        }
      }

      if (historyRaw) {
        const parsed: unknown = JSON.parse(historyRaw)
        if (!Array.isArray(parsed)) {
          console.warn('[ActiveShoppingStore] Invalid history data, clearing')
          await AsyncStorage.removeItem(historyKey)
          return
        }
        const history = parsed as ShoppingSession[]
        set({ history: [...history].sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? '')) })
      } else {
        set({ history: [] })
      }
    } catch (error) {
      console.warn('[ActiveShoppingStore] Failed to load history:', error)
    }
  },

  startShopping: (items: ShoppingItem[]) => {
    const checkedItems = items
      .filter((item) => item.isChecked)
      .sort((a, b) => a.order - b.order)

    const shoppingItems: ActiveShoppingItem[] = checkedItems.map((item, index) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      isBought: false,
      order: index,
      purchasedAt: null,
    }))

    const session: ShoppingSession = {
      id: randomUUID(),
      items: shoppingItems,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    }

    set({ session, showBought: true })
    persistSession(session, get().currentListId)
  },

  toggleBought: (id: string) => {
    const { session } = get()
    if (!session) return

    const updatedItems = session.items.map((item) =>
      item.id === id
        ? { ...item, isBought: !item.isBought, purchasedAt: !item.isBought ? new Date().toISOString() : null }
        : item,
    )
    const updatedSession = { ...session, items: updatedItems }
    set({ session: updatedSession })
    persistSession(updatedSession, get().currentListId)
  },

  toggleShowBought: () => {
    set({ showBought: !get().showBought })
  },

  finishShopping: async () => {
    const { session, isFinishing, currentListId } = get()
    if (!session || isFinishing || !currentListId) return

    set({ isFinishing: true })

    try {
      const finishedSession: ShoppingSession = {
        ...session,
        finishedAt: new Date().toISOString(),
      }

      const firebaseListId = getFirebaseListId(currentListId)
      if (firebaseListId) {
        await firebaseAddHistory(firebaseListId, finishedSession)
        await firebaseSetSession(firebaseListId, null)
      } else {
        const historyKey = `@list_${currentListId}_history`
        const sessionKey = `@list_${currentListId}_session`
        const historyRaw = await AsyncStorage.getItem(historyKey)
        const history = historyRaw ? (JSON.parse(historyRaw) as ShoppingSession[]) : []
        history.push(finishedSession)
        await AsyncStorage.setItem(historyKey, JSON.stringify(history))
        await AsyncStorage.removeItem(sessionKey)
      }

      // Only clear session after successful persistence
      set({ session: null, showBought: true })
    } catch (error) {
      console.warn('[ActiveShoppingStore] Failed to finish shopping, keeping session:', error)
      // Don't clear session — user can retry
    } finally {
      set({ isFinishing: false })
    }
  },

  removeSession: async (id: string) => {
    const { currentListId } = get()
    if (!currentListId) return

    const updated = get().history.filter((s) => s.id !== id)
    set({ history: updated })

    const firebaseListId = getFirebaseListId(currentListId)
    if (firebaseListId) {
      await firebaseRemoveHistory(firebaseListId, id).catch((e) =>
        console.warn('[ActiveShoppingStore] Firebase remove history failed:', e),
      )
    } else {
      const historyKey = `@list_${currentListId}_history`
      await AsyncStorage.setItem(historyKey, JSON.stringify(updated)).catch((e) =>
        console.warn('[ActiveShoppingStore] Failed to persist history:', e),
      )
    }
  },

  clearHistory: async () => {
    const { currentListId } = get()
    if (!currentListId) return

    set({ history: [] })

    const firebaseListId = getFirebaseListId(currentListId)
    if (firebaseListId) {
      await firebaseClearHistory(firebaseListId).catch((e) =>
        console.warn('[ActiveShoppingStore] Firebase clear history failed:', e),
      )
    } else {
      const historyKey = `@list_${currentListId}_history`
      await AsyncStorage.removeItem(historyKey).catch((e) =>
        console.warn('[ActiveShoppingStore] Failed to clear history:', e),
      )
    }
  },

  setSessionFromFirebase: (session: ShoppingSession | null) => {
    set({ session })
  },
}))

function getFirebaseListId(listId: string | null): string | null {
  if (!listId) return null
  const listMeta = useListsMetaStore.getState().lists.find((l) => l.id === listId)
  if (listMeta?.isShared && listMeta.firebaseListId) return listMeta.firebaseListId
  return null
}

function persistSession(session: ShoppingSession, listId: string | null): void {
  if (!listId) return
  const firebaseListId = getFirebaseListId(listId)
  if (firebaseListId) {
    firebaseSetSession(firebaseListId, session).catch((e) =>
      console.warn('[ActiveShoppingStore] Firebase session persist failed:', e),
    )
  } else {
    debouncedPersist(`@list_${listId}_session`, session)
  }
}
