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
  subscribeToList,
} from '../services/FirebaseSyncService'
import { useActiveShoppingStore } from './ActiveShoppingStore'

export interface ShoppingListStoreState {
  items: ShoppingItem[]
  isLoaded: boolean
  currentListId: string | null
  // Offline conflict resolution state
  firebaseSnapshotTimestamp: number | null    // updatedAt from last Firebase onMeta sync
  hasLocalOfflineChanges: boolean             // true when a Firebase write failed (offline)
  conflictPending: boolean                    // true when conflict dialog should show
  conflictPendingItems: ShoppingItem[] | null // Firebase items waiting for conflict resolution
  conflictFirebaseTimestamp: number | null    // meta.updatedAt that triggered the conflict (correct new snapshot)
  conflictLocalItems: ShoppingItem[] | null   // local items snapshot at conflict-detection time (for KeepLocal)
  conflictOwnerListId: string | null          // listId that owns this conflict (safe after switchToList)
  conflictOwnerFbId: string | null            // Firebase listId that owns this conflict (safe after switchToList)

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
  resolveConflictKeepLocal: () => void
  resolveConflictTakeFirebase: () => void
}

let currentFirebaseUnsub: (() => void) | null = null

export const useShoppingListStore = create<ShoppingListStoreState>((set, get) => ({
  items: [],
  isLoaded: false,
  currentListId: null,
  firebaseSnapshotTimestamp: null,
  hasLocalOfflineChanges: false,
  conflictPending: false,
  conflictPendingItems: null,
  conflictFirebaseTimestamp: null,
  conflictLocalItems: null,
  conflictOwnerListId: null,
  conflictOwnerFbId: null,

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
            .map((item, i) => ({ ...item, createdAt: item.createdAt ?? new Date(0).toISOString(), order: i }))
        }
      }
      debugLog('Store', `Local items loaded: ${localItems.length}`)
    } catch (error) {
      debugLog('Store', `Failed to load local items: ${error}`)
      console.warn('[ShoppingListStore] Failed to load local items:', error)
    }

    // Load persisted offline state (survives app kill during offline)
    let firebaseSnapshotTimestamp: number | null = null
    let hasLocalOfflineChanges = false
    if (listMeta?.isShared) {
      const [snapshotTsRaw, localChangesRaw] = await Promise.all([
        AsyncStorage.getItem(`@list_${listId}_snapshotTs`),
        AsyncStorage.getItem(`@list_${listId}_hasLocalChanges`),
      ])
      firebaseSnapshotTimestamp = snapshotTsRaw ? Number(snapshotTsRaw) : null
      hasLocalOfflineChanges = localChangesRaw === 'true'
      debugLog('Store', `Offline state: snapshotTs=${firebaseSnapshotTimestamp ?? 'null'}, hasLocalChanges=${hasLocalOfflineChanges}`)
    }

    // Show local data immediately
    set({
      items: localItems,
      currentListId: listId,
      isLoaded: true,
      firebaseSnapshotTimestamp,
      hasLocalOfflineChanges,
      conflictPending: false,
      conflictPendingItems: null,
      conflictFirebaseTimestamp: null,
      conflictLocalItems: null,
      conflictOwnerListId: null,
      conflictOwnerFbId: null,
    })

    // If shared, also subscribe to Firebase — will override local data when it arrives
    if (listMeta?.isShared && listMeta.firebaseListId) {
      debugLog('Store', `List is shared — subscribing to Firebase: ${listMeta.firebaseListId}`)
      // Guard against stale async: if switchToList was called again while we were loading local data,
      // currentListId has moved on — don't subscribe and leave the newer call's listener intact
      if (get().currentListId !== listId) {
        debugLog('Store', `switchToList: stale call for ${listId}, currentListId=${get().currentListId ?? 'null'}, aborting subscribe`)
        return
      }
      const firebaseListId = listMeta.firebaseListId
      currentFirebaseUnsub = subscribeToList(firebaseListId, {
        onItems: (items) => {
          const isCurrentList = get().currentListId === listId
          debugLog('Store', `onItems callback: ${items.length} items, isCurrentList=${isCurrentList}`)
          if (!isCurrentList) return

          if (get().hasLocalOfflineChanges) {
            // We have offline changes — hold Firebase items until onMeta decides what to do.
            const { conflictPending: alreadyPending, conflictFirebaseTimestamp: pendingTs } = get()

            if (alreadyPending) {
              // onMeta already fired and set conflictPending=true (race: onMeta before onItems).
              // We now have the real Firebase items — re-trigger the dialog so the useEffect fires.
              debugLog('Store', 'onItems: conflictPending already true (onMeta fired first), re-triggering dialog')
              set({ conflictPendingItems: items, conflictPending: false })
              // Flip back in the same microtask queue so useEffect dependency sees a new value.
              // Guard with currentListId===listId: if switchToList ran during this microtask gap
              // and both lists have hasLocalOfflineChanges=true, this would incorrectly set
              // conflictPending=true for the new list (with conflictOwnerListId=null → no-op Alert).
              Promise.resolve().then(() => {
                if (get().currentListId === listId && get().hasLocalOfflineChanges) {
                  set({ conflictPending: true })
                }
              })
            } else if (pendingTs !== null) {
              // onMeta fired in the snapshotTs=null branch — it stored conflictFirebaseTimestamp
              // but intentionally deferred conflictPending=true until items arrived (us, right now).
              // Set both together so resolveConflictTakeFirebase is never called with null items.
              debugLog('Store', 'onItems: conflictFirebaseTimestamp set by onMeta, now setting conflictPendingItems + conflictPending=true')
              set({ conflictPendingItems: items, conflictPending: true })
            } else {
              debugLog('Store', 'onItems: hasLocalOfflineChanges=true, storing conflictPendingItems')
              set({ conflictPendingItems: items })
            }
          } else {
            set({ items })
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
          if (get().currentListId !== listId) return
          debugLog('Store', `onMeta callback: name="${meta.name}", updatedAt=${meta.updatedAt}`)

          // Sync list name from Firebase to local meta
          const currentMeta = useListsMetaStore.getState().lists.find((l) => l.id === listId)
          if (currentMeta && currentMeta.name !== meta.name) {
            useListsMetaStore.getState().renameList(listId, meta.name)
          }

          const { hasLocalOfflineChanges: hasChanges, firebaseSnapshotTimestamp: snapshotTs } = get()

          if (hasChanges && snapshotTs !== null) {
            if (meta.updatedAt > snapshotTs) {
              // CONFLICT: Firebase has newer state than our snapshot — someone else changed it.
              // Capture all conflict context from the closure so resolve actions remain correct
              // even if switchToList changes currentListId before the user taps a button.
              debugLog('Store', `onMeta: CONFLICT detected — Firebase updatedAt=${meta.updatedAt} > snapshotTs=${snapshotTs}`)
              set({
                conflictPending: true,
                conflictFirebaseTimestamp: meta.updatedAt,
                conflictLocalItems: get().items,
                conflictOwnerListId: listId,
                conflictOwnerFbId: firebaseListId,
              })
            } else {
              // No one else changed it — silently overwrite Firebase with our local version.
              // clearOfflineState only after a successful write — if write fails (still offline),
              // logFirebaseError re-sets hasLocalOfflineChanges and we retry on next onMeta.
              debugLog('Store', `onMeta: no conflict — overwriting Firebase with local version`)
              const itemsToWrite = get().items
              firebaseSetItems(firebaseListId, itemsToWrite)
                .then(() => clearOfflineState(listId, meta.updatedAt))
                .catch((e: unknown) => logFirebaseError(e, true, listId, itemsToWrite))
            }
          } else if (hasChanges && snapshotTs === null) {
            // No baseline snapshot (first open, AsyncStorage cleared) — can't know if Firebase is newer.
            // Store the timestamp + conflict context but wait for onItems to set conflictPending=true,
            // so resolveConflictTakeFirebase is never called with conflictPendingItems=null.
            debugLog('Store', `onMeta: hasLocalChanges=true but no baseline snapshotTs — waiting for onItems before showing dialog`)
            set({
              conflictFirebaseTimestamp: meta.updatedAt,
              conflictLocalItems: get().items,
              conflictOwnerListId: listId,
              conflictOwnerFbId: firebaseListId,
            })
          } else if (!hasChanges) {
            // Normal online state — update snapshot timestamp
            set({ firebaseSnapshotTimestamp: meta.updatedAt })
            AsyncStorage.setItem(`@list_${listId}_snapshotTs`, String(meta.updatedAt)).catch(() => {})
          }
        },
        onHistory: (sessions) => {
          if (get().currentListId === listId) {
            debugLog('Store', `onHistory callback: ${sessions.length} sessions`)
            useActiveShoppingStore.getState().setHistoryFromFirebase(sessions)
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
      // Zdieľaný: optimistický update pre okamžitú odozvu + Firebase write
      const updated = [...items, newItem]
      set({ items: updated })
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
      // Zdieľaný: optimistický update + Firebase write
      const updated = get().items.filter((item) => item.id !== id).map((item, i) => ({ ...item, order: i }))
      set({ items: updated })
      firebaseRemoveItemsAndReorder(fbId, [id], updated).catch(logFirebaseError)
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
      // Zdieľaný: optimistický update + Firebase write
      const updated = get().items.map((i) => i.id === id ? { ...i, isChecked: newChecked } : i)
      set({ items: updated })
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
      // Zdieľaný: optimistický update + Firebase write
      const updated = get().items.map((item) => item.id === id ? { ...item, name: trimmed } : item)
      set({ items: updated })
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
      // Zdieľaný: optimistický update + Firebase write
      const updated = get().items.map((i) => i.id === id ? { ...i, quantity: newQty } : i)
      set({ items: updated })
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
      // Zdieľaný: optimistický update + Firebase write
      const updated = get().items.map((i) => i.id === id ? { ...i, quantity: newQty } : i)
      set({ items: updated })
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
      // Zdieľaný: optimistický update + Firebase write
      const idSet = new Set(ids)
      const updated = get().items.map((item) => idSet.has(item.id) ? { ...item, isChecked: false } : item)
      set({ items: updated })
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
      // Zdieľaný: optimistický update + Firebase write
      const updated = get().items.filter((item) => !item.isChecked).map((item, i) => ({ ...item, order: i }))
      set({ items: updated })
      firebaseRemoveItemsAndReorder(fbId, checkedIds, updated).catch(logFirebaseError)
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
      // Zdieľaný: optimistický update + Firebase write
      set({ items: [] })
      firebaseRemoveItemsAndReorder(fbId, allIds, []).catch(logFirebaseError)
    } else {
      set({ items: [] })
      persistLocal([], get().currentListId)
    }
  },

  setItemsFromFirebase: (items: ShoppingItem[]) => {
    set({ items })
  },

  resolveConflictKeepLocal: () => {
    // Use conflict-time snapshots captured when the conflict was detected, not live get() values.
    // This prevents corruption if switchToList ran between conflict detection and user's button tap.
    const { conflictLocalItems, conflictOwnerListId, conflictOwnerFbId, conflictFirebaseTimestamp } = get()
    if (!conflictOwnerFbId || !conflictOwnerListId || !conflictLocalItems) return
    // Optimistically clear offline state first so the UI updates immediately (dialog + banner gone).
    // clearOfflineState has its own currentListId guard — safe even if we've switched lists.
    clearOfflineState(conflictOwnerListId, conflictFirebaseTimestamp ?? Date.now())
    // Write the captured local items (not current list's items) to the correct Firebase list.
    firebaseSetItems(conflictOwnerFbId, conflictLocalItems).catch((e: unknown) => logFirebaseError(e, true, conflictOwnerListId, conflictLocalItems))
  },

  resolveConflictTakeFirebase: () => {
    // Use conflict-time snapshots — safe even if switchToList ran before user tapped.
    const { conflictPendingItems, conflictOwnerListId, conflictFirebaseTimestamp, currentListId } = get()
    if (!conflictPendingItems || !conflictOwnerListId) return
    // Only update live items if we're still on the conflict's list — avoids briefly showing
    // list A's items under list B if the user switched lists while the Alert was visible.
    if (currentListId === conflictOwnerListId) {
      set({ items: conflictPendingItems })
    }
    // Always persist to the correct list's AsyncStorage key (safe regardless of currentListId).
    debouncedPersist(`@list_${conflictOwnerListId}_items`, conflictPendingItems)
    clearOfflineState(conflictOwnerListId, conflictFirebaseTimestamp ?? Date.now())
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

// Clears offline tracking state both in-memory and in AsyncStorage.
// Called after successful conflict resolution (keep local or take Firebase).
function clearOfflineState(listId: string, newTimestamp: number): void {
  // Only mutate in-memory state if this list is still the active one.
  // Async continuations (.then after firebaseSetItems) can race with switchToList —
  // without this guard, they would corrupt the new list's offline tracking state.
  if (useShoppingListStore.getState().currentListId === listId) {
    useShoppingListStore.setState({
      hasLocalOfflineChanges: false,
      conflictPending: false,
      conflictPendingItems: null,
      conflictFirebaseTimestamp: null,
      conflictLocalItems: null,
      conflictOwnerListId: null,
      conflictOwnerFbId: null,
      firebaseSnapshotTimestamp: newTimestamp,
    })
  }
  // AsyncStorage writes are always correct — keyed per list, never contaminate other lists.
  AsyncStorage.multiRemove([`@list_${listId}_hasLocalChanges`]).catch(() => {})
  AsyncStorage.setItem(`@list_${listId}_snapshotTs`, String(newTimestamp)).catch(() => {})
}

let lastOfflineAlertAt = 0
const OFFLINE_ALERT_COOLDOWN_MS = 60_000

// overrideListId + overrideItems: when the failed write originated from a conflict-resolution
// path (resolveConflictKeepLocal), the current list may have changed by rejection time.
// Pass the original list context so persist and offline-flag go to the correct list.
function logFirebaseError(e: unknown, silent = false, overrideListId?: string, overrideItems?: ShoppingItem[]): void {
  const msg = e instanceof Error ? e.message : String(e)
  debugLog('Store', `Firebase operation FAILED: ${msg}`)
  console.warn('[ShoppingListStore] Firebase operation failed:', msg)

  // Persist items to AsyncStorage as offline fallback cache.
  // Use overrideListId/Items when provided (conflict-resolution paths) to avoid reading
  // stale currentListId if switchToList ran between the write initiation and its rejection.
  const { items: liveItems, currentListId: liveListId } = useShoppingListStore.getState()
  const targetListId = overrideListId ?? liveListId
  const targetItems = overrideItems ?? liveItems
  if (targetListId) {
    persistLocal(targetItems, targetListId)
  }

  // Mark that the target list has local offline changes not yet synced to Firebase.
  if (targetListId && getFirebaseListId(targetListId)) {
    // Only update in-memory state if the target list is still active — avoid contaminating
    // a different list's hasLocalOfflineChanges if switchToList ran before rejection.
    if (targetListId === liveListId) {
      useShoppingListStore.setState({ hasLocalOfflineChanges: true })
    }
    AsyncStorage.setItem(`@list_${targetListId}_hasLocalChanges`, 'true').catch(() => {})
  }

  // Silent mode: suppress the Alert for writes originating from conflict resolution paths
  // (resolveConflictKeepLocal, onMeta no-conflict overwrite) — the user just interacted with
  // a conflict dialog, so an immediate "you're offline" alert would be jarring and confusing.
  if (silent) return

  const now = Date.now()
  if (now - lastOfflineAlertAt > OFFLINE_ALERT_COOLDOWN_MS) {
    lastOfflineAlertAt = now
    Alert.alert(
      i18n.t('Sharing.offlineTitle'),
      i18n.t('Sharing.offlineWarning'),
    )
  }
}
