import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
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
  addItemToSession: (shoppingItem: ShoppingItem, insertAtOrder: number | null) => void
  setSessionFromFirebase: (session: ShoppingSession | null) => void
  setHistoryFromFirebase: (sessions: ShoppingSession[]) => void
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
      toggledAt: null,
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

  addItemToSession: (shoppingItem: ShoppingItem, insertAtOrder: number | null) => {
    const { session } = get()
    if (!session) return

    // Don't add duplicates
    if (session.items.some((i) => i.id === shoppingItem.id)) return

    const newActiveItem: ActiveShoppingItem = {
      id: shoppingItem.id,
      name: shoppingItem.name,
      quantity: shoppingItem.quantity,
      isBought: false,
      order: 0,
      purchasedAt: null,
      toggledAt: null,
    }

    let updatedItems: ActiveShoppingItem[]
    if (insertAtOrder !== null) {
      // Insert at the correct position based on shopping list order
      const insertIndex = session.items.filter((i) => i.order < insertAtOrder).length
      updatedItems = [...session.items]
      updatedItems.splice(insertIndex, 0, newActiveItem)
    } else {
      // Append to end
      updatedItems = [...session.items, newActiveItem]
    }

    // Reindex orders
    updatedItems = updatedItems.map((item, index) => ({ ...item, order: index }))

    const updatedSession = { ...session, items: updatedItems }
    set({ session: updatedSession })
    persistSession(updatedSession, get().currentListId)
  },

  toggleBought: (id: string) => {
    // Per-item in-progress guard: prevents double-tap from firing two concurrent Firebase writes
    // with opposite isBought values. The functional set() below handles local state correctly,
    // but two rapid persistSession() calls would race on the Firebase side.
    if (togglingItemIds.has(id)) return
    togglingItemIds.add(id)

    // Use functional update to read latest state — prevents stale closure from toggling wrong value.
    // Capture the resulting session inside set() so persistSession uses the exact committed state.
    let committedSession: ShoppingSession | null = null
    set((state) => {
      if (!state.session) return state
      const now = new Date().toISOString()
      const updatedItems = state.session.items.map((item) =>
        item.id === id
          ? { ...item, isBought: !item.isBought, purchasedAt: !item.isBought ? now : null, toggledAt: now }
          : item,
      )
      committedSession = { ...state.session, items: updatedItems }
      return { session: committedSession }
    })
    if (committedSession) {
      persistSession(committedSession, get().currentListId)
    }

    // Release the guard after a short delay — long enough to prevent double-tap,
    // short enough to allow intentional re-toggle after ~300ms
    setTimeout(() => togglingItemIds.delete(id), 300)
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
      // Deduplicate by id — prevents double entry if two devices finish simultaneously (idempotent Firebase write)
      const updatedHistory = [finishedSession, ...get().history.filter((s) => s.id !== finishedSession.id)]
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
    const { currentListId } = get()

    if (!session) {
      set({ session: null })
      if (currentListId) {
        // Firebase cleared session (another device finished) — remove local cache too
        AsyncStorage.removeItem(`@list_${currentListId}_session`).catch(() => {})
      }
      return
    }

    // Merge strategy: if Firebase session ID matches local, preserve offline isBought/purchasedAt changes.
    // This prevents the Firebase listener from overwriting items toggled offline before sync completes.
    // If session IDs differ (another user started a new session), use Firebase version as-is.
    const localSession = get().session
    let mergedSession = session
    if (localSession && localSession.id === session.id) {
      // Build a map of local item states — these contain any offline toggleBought changes
      const localItemMap = new Map(localSession.items.map((item) => [item.id, item]))
      mergedSession = {
        ...session,
        items: session.items.map((firebaseItem) => {
          const localItem = localItemMap.get(firebaseItem.id)
          // If local item was toggled more recently (purchasedAt is set locally but not in Firebase,
          // or local purchasedAt is newer), keep the local isBought/purchasedAt state.
          if (localItem) {
            // Compare toggledAt timestamps to determine which state is more recent.
            // toggledAt is set on every toggle AND un-toggle, so it correctly handles
            // the case where purchasedAt=null (un-toggle offline) vs an older Firebase purchasedAt.
            const localTime = localItem.toggledAt ?? localItem.purchasedAt ?? ''
            const firebaseTime = firebaseItem.toggledAt ?? firebaseItem.purchasedAt ?? ''
            if (localTime > firebaseTime) {
              return {
                ...firebaseItem,
                isBought: localItem.isBought,
                purchasedAt: localItem.purchasedAt,
                toggledAt: localItem.toggledAt,
              }
            }
          }
          return firebaseItem
        }),
      }
    }

    set({ session: mergedSession })
    if (currentListId) {
      // Cache merged session locally so restart preserves state before listener reconnects
      debouncedPersist(`@list_${currentListId}_session`, mergedSession)
    }
  },

  setHistoryFromFirebase: (sessions: ShoppingSession[]) => {
    // Merge Firebase sessions with any in-memory sessions not yet propagated to Firebase listener.
    // This prevents finishShopping's optimistic history entry from being lost if the onHistory
    // listener fires before Firebase has propagated the just-written session.
    //
    // Time-bounded localOnly: only keep local-only sessions finished within the last 30 seconds.
    // This covers the propagation delay window (finishShopping writes Firebase, onHistory fires before
    // Firebase delivers the new session back). Sessions older than 30s that are absent from Firebase
    // were genuinely deleted (removeSession/clearHistory) — we must not keep them.
    const localHistory = get().history
    const firebaseIds = new Set(sessions.map((s) => s.id))
    const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString()
    const localOnly = localHistory.filter(
      (s) => !firebaseIds.has(s.id) && (s.finishedAt ?? '') >= thirtySecondsAgo,
    )
    const merged = [...localOnly, ...sessions].sort(
      (a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''),
    )
    set({ history: merged })
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

// Per-item toggle guard — prevents double-tap from firing two concurrent Firebase writes
const togglingItemIds = new Set<string>()

function logFirebaseError(e: unknown): void {
  const msg = e instanceof Error ? e.message : String(e)
  console.warn('[ActiveShoppingStore] Firebase session sync failed (offline?):', msg)

  // Persist session locally as fallback — offline nakupovanie musí fungovať
  const { session, currentListId } = useActiveShoppingStore.getState()
  if (currentListId && session) {
    debouncedPersist(`@list_${currentListId}_session`, session)
  }

  // BEZ Alert — session sync je best-effort, offline nakupovanie (toggleBought) musí byť tiché
  // Alert sa zobrazuje len v finishShopping() catch bloku kde je to kritické
}
