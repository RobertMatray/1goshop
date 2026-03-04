import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert } from 'react-native'
import { randomUUID } from 'expo-crypto'
import i18n from '../i18n/i18n'
import type { ShoppingItem, ActiveShoppingItem, ShoppingSession } from '../types/shopping'
import { debouncedPersist } from '../services/debouncedPersist'
import { useListsMetaStore } from './ListsMetaStore'
import {
  firebaseSetSession,
  firebaseAddHistory,
  firebaseFinishShopping,
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
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          !('id' in parsed) ||
          !('items' in parsed) ||
          !Array.isArray((parsed as Record<string, unknown>).items)
        ) {
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
        // Firebase succeeded — use its data as source of truth (even if empty)
        set({ history })
        if (history.length > 0) {
          // Cache to local storage for offline access
          const historyKey = `@list_${currentListId}_history`
          await AsyncStorage.setItem(historyKey, JSON.stringify(history)).catch(() => {})
        }
        return
      } catch (error) {
        console.warn('[ActiveShoppingStore] Failed to load Firebase history, falling back to local:', error)
      }
      // Fallback to local storage only if Firebase request failed (network error etc.)
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
    // Use functional update to read latest state — prevents double-tap from toggling back.
    // Capture the resulting session inside set() so persistSession uses the exact committed state.
    let committedSession: ShoppingSession | null = null
    set((state) => {
      if (!state.session) return state
      const updatedItems = state.session.items.map((item) =>
        item.id === id
          ? { ...item, isBought: !item.isBought, purchasedAt: !item.isBought ? new Date().toISOString() : null }
          : item,
      )
      committedSession = { ...state.session, items: updatedItems }
      return { session: committedSession }
    })
    if (committedSession) {
      persistSession(committedSession, get().currentListId)
    }
  },

  toggleShowBought: () => {
    set({ showBought: !get().showBought })
  },

  finishShopping: async () => {
    if (isFinishingInProgress) return
    const { session, currentListId } = get()
    if (!session || !currentListId) return

    isFinishingInProgress = true
    set({ isFinishing: true })

    try {
      const finishedSession: ShoppingSession = {
        ...session,
        finishedAt: new Date().toISOString(),
      }

      const firebaseListId = getFirebaseListId(currentListId)
      if (firebaseListId) {
        // Atomically write history + clear session in one Firebase update (prevents duplicate history on retry)
        await firebaseFinishShopping(firebaseListId, finishedSession)
        // Clear local session cache so a restart doesn't resurrect the finished session
        await AsyncStorage.removeItem(`@list_${currentListId}_session`).catch(() => {})
      } else {
        const historyKey = `@list_${currentListId}_history`
        const sessionKey = `@list_${currentListId}_session`
        const historyRaw = await AsyncStorage.getItem(historyKey)
        let history: ShoppingSession[] = []
        if (historyRaw) {
          try {
            const parsed: unknown = JSON.parse(historyRaw)
            if (Array.isArray(parsed)) {
              history = parsed as ShoppingSession[]
            }
          } catch {
            console.warn('[ActiveShoppingStore] Corrupted history data, starting fresh')
          }
        }
        history.push(finishedSession)
        await AsyncStorage.setItem(historyKey, JSON.stringify(history))
        await AsyncStorage.removeItem(sessionKey)
      }

      // Only clear session after successful persistence; update history in-memory for immediate UI update
      const updatedHistory = [finishedSession, ...get().history]
      set({ session: null, showBought: true, history: updatedHistory })
    } catch (error) {
      console.warn('[ActiveShoppingStore] Failed to finish shopping, keeping session:', error)
      // Don't clear session — user can retry
    } finally {
      isFinishingInProgress = false
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
      await firebaseRemoveHistory(firebaseListId, id).catch(logFirebaseError)
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
      await firebaseClearHistory(firebaseListId).catch(logFirebaseError)
    } else {
      const historyKey = `@list_${currentListId}_history`
      await AsyncStorage.removeItem(historyKey).catch((e) =>
        console.warn('[ActiveShoppingStore] Failed to clear history:', e),
      )
    }
  },

  setSessionFromFirebase: (session: ShoppingSession | null) => {
    set({ session })
    const { currentListId } = get()
    if (!currentListId) return
    if (session) {
      // Cache Firebase session locally so restart doesn't lose state before listener reconnects
      debouncedPersist(`@list_${currentListId}_session`, session)
    } else {
      // When Firebase clears the session, also remove local cache to prevent stale session on restart
      AsyncStorage.removeItem(`@list_${currentListId}_session`).catch(() => {})
    }
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
    firebaseSetSession(firebaseListId, session).catch(logFirebaseError)
  } else {
    debouncedPersist(`@list_${listId}_session`, session)
  }
}

// Module-level flag for finishShopping — prevents double-tap from creating duplicate history entries
// (Zustand set() is not synchronous enough to guard against rapid consecutive calls)
let isFinishingInProgress = false

let lastOfflineAlertAt = 0
const OFFLINE_ALERT_COOLDOWN_MS = 60_000

function logFirebaseError(e: unknown): void {
  const msg = e instanceof Error ? e.message : String(e)
  console.warn('[ActiveShoppingStore] Firebase operation failed:', msg)

  // Persist session locally as fallback
  const { session, currentListId } = useActiveShoppingStore.getState()
  if (currentListId && session) {
    debouncedPersist(`@list_${currentListId}_session`, session)
  }

  const now = Date.now()
  if (now - lastOfflineAlertAt > OFFLINE_ALERT_COOLDOWN_MS) {
    lastOfflineAlertAt = now
    Alert.alert(
      i18n.t('Sharing.offlineTitle'),
      i18n.t('Sharing.offlineWarning'),
    )
  }
}
