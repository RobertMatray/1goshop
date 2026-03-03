import { signInAnonymously as firebaseSignIn, onAuthStateChanged, type User } from 'firebase/auth'
import {
  ref,
  set,
  push,
  remove,
  update,
  onValue,
  get as firebaseGet,
  type Unsubscribe,
} from 'firebase/database'
import { Platform } from 'react-native'
import { getFirebaseAuth, getFirebaseDb } from './firebaseConfig'
import type { ShoppingItem, ShoppingSession } from '../types/shopping'
import { debugLog } from './DebugLogger'

// Human-readable device name used when registering as a list member
export const DEVICE_NAME = Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android' : 'Web'

// ─── Sharing code charset (30 chars: no O/0/I/1/L) ───
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
const CODE_EXPIRY_MS = 15 * 60 * 1000 // 15 minutes

// ─── Firebase data shapes ───
export interface FirebaseListMeta {
  name: string
  createdAt: number
  updatedAt: number
  createdBy: string
  members: Record<string, { joinedAt: number; deviceName: string }>
}

export interface FirebaseItem {
  id: string
  name: string
  quantity: number
  isChecked: boolean
  order: number
  createdAt: string
  updatedAt: number
}

export interface FirebaseSharingCode {
  firebaseListId: string
  listName: string
  createdBy: string
  createdAt: number
  expiresAt: number
}

// ─── Auth ───

let currentUser: User | null = null

export async function initFirebase(): Promise<void> {
  debugLog('Firebase', 'initFirebase() called')
  const auth = getFirebaseAuth()

  // First check if there's a cached auth session
  const cachedUser = await new Promise<User | null>((resolve) => {
    const timeout = setTimeout(() => {
      debugLog('Firebase', 'Auth state check timed out after 5s')
      unsub()
      resolve(null)
    }, 5_000)

    const unsub = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout)
      unsub()
      debugLog('Firebase', `Cached auth: ${user ? `UID=${user.uid}` : 'none'}`)
      resolve(user)
    })
  })

  if (cachedUser) {
    currentUser = cachedUser
    debugLog('Firebase', `Using cached user: ${cachedUser.uid}`)
    return
  }

  // No cached session — sign in anonymously
  try {
    const cred = await firebaseSignIn(auth)
    currentUser = cred.user
    debugLog('Firebase', `Anonymous sign-in OK: ${cred.user.uid}`)
  } catch (e) {
    debugLog('Firebase', `Anonymous sign-in FAILED: ${e}`)
    console.warn('[FirebaseSyncService] Anonymous sign-in failed:', e)
  }
}

export async function signInAnonymously(): Promise<string> {
  const auth = getFirebaseAuth()
  if (auth.currentUser) return auth.currentUser.uid
  const cred = await firebaseSignIn(auth)
  currentUser = cred.user
  return cred.user.uid
}

export function getCurrentUid(): string | null {
  return getFirebaseAuth().currentUser?.uid ?? null
}

// ─── List CRUD ───

export async function createFirebaseList(
  name: string,
  deviceId: string,
  deviceName: string,
  items: ShoppingItem[],
  session: ShoppingSession | null,
  history: ShoppingSession[],
): Promise<string> {
  const uid = await signInAnonymously()
  const db = getFirebaseDb()
  const listRef = push(ref(db, 'lists'))
  const listId = listRef.key!

  const now = Date.now()
  const meta: FirebaseListMeta = {
    name,
    createdAt: now,
    updatedAt: now,
    createdBy: uid,
    members: {
      [uid]: { joinedAt: now, deviceName },
    },
  }

  const firebaseItems: Record<string, FirebaseItem> = {}
  for (const item of items) {
    firebaseItems[item.id] = {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      isChecked: item.isChecked,
      order: item.order,
      createdAt: item.createdAt,
      updatedAt: now,
    }
  }

  const updates: Record<string, unknown> = {
    [`lists/${listId}/meta`]: meta,
    [`lists/${listId}/items`]: firebaseItems,
  }

  if (session) {
    updates[`lists/${listId}/session`] = session
  }

  if (history.length > 0) {
    const historyData: Record<string, ShoppingSession> = {}
    for (const s of history) {
      historyData[s.id] = s
    }
    updates[`lists/${listId}/history`] = historyData
  }

  await update(ref(db), updates)
  return listId
}

// ─── Sharing codes ───

function generateSharingCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export async function createSharingCode(
  firebaseListId: string,
  listName: string,
): Promise<string> {
  const uid = await signInAnonymously()
  const db = getFirebaseDb()

  // Retry up to 5 times if code already exists
  let collisions = 0
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSharingCode()
    const existingSnap = await firebaseGet(ref(db, `sharing-codes/${code}`))
    if (existingSnap.exists()) {
      collisions++
      console.warn(`[FirebaseSyncService] Sharing code collision #${collisions}: ${code}`)
      continue
    }

    const now = Date.now()
    const sharingData: FirebaseSharingCode = {
      firebaseListId,
      listName,
      createdBy: uid,
      createdAt: now,
      expiresAt: now + CODE_EXPIRY_MS,
    }

    await set(ref(db, `sharing-codes/${code}`), sharingData)
    return code
  }

  throw new Error(`Failed to generate unique sharing code after 5 attempts (${collisions} collisions)`)
}

export async function joinSharedList(
  code: string,
  deviceName: string,
): Promise<{ firebaseListId: string; listName: string } | null> {
  const uid = await signInAnonymously()
  const db = getFirebaseDb()
  debugLog('Join', `joinSharedList: UID=${uid}, code=${code.toUpperCase()}`)

  const codeSnap = await firebaseGet(ref(db, `sharing-codes/${code.toUpperCase()}`))
  if (!codeSnap.exists()) {
    debugLog('Join', 'Sharing code not found in Firebase')
    return null
  }

  const data = codeSnap.val() as FirebaseSharingCode
  debugLog('Join', `Code data: firebaseListId=${data.firebaseListId}, listName="${data.listName}"`)

  if (Date.now() > data.expiresAt) {
    debugLog('Join', 'Sharing code expired')
    await remove(ref(db, `sharing-codes/${code.toUpperCase()}`)).catch(() => {})
    return null
  }

  // Add device as member
  const memberPath = `lists/${data.firebaseListId}/meta/members/${uid}`
  debugLog('Join', `Writing member to: ${memberPath}`)
  try {
    await set(ref(db, memberPath), {
      joinedAt: Date.now(),
      deviceName,
    })
    debugLog('Join', 'Member write SUCCESS')
  } catch (e) {
    debugLog('Join', `Member write FAILED: ${e}`)
    throw e
  }

  // Verify member was written
  try {
    const verifySnap = await firebaseGet(ref(db, memberPath))
    debugLog('Join', `Member verify: exists=${verifySnap.exists()}, val=${JSON.stringify(verifySnap.val())}`)
  } catch (e) {
    debugLog('Join', `Member verify FAILED (read denied?): ${e}`)
  }

  // Check current auth UID matches what we wrote
  const currentAuthUid = getFirebaseAuth().currentUser?.uid
  debugLog('Join', `Post-write auth check: currentUser.uid=${currentAuthUid}, wrote as uid=${uid}, match=${currentAuthUid === uid}`)

  // Remove used sharing code
  await remove(ref(db, `sharing-codes/${code.toUpperCase()}`))
  debugLog('Join', 'Sharing code removed, join complete')

  return { firebaseListId: data.firebaseListId, listName: data.listName }
}

// ─── Real-time listeners ───

interface ListCallbacks {
  onItems: (items: ShoppingItem[]) => void
  onSession: (session: ShoppingSession | null) => void
  onMeta: (meta: FirebaseListMeta) => void
}

// Keys: firebaseListId → real Firebase onValue unsubs
//       firebaseListId + '__retry' → cleanup closure for a deferred auth-retry subscribe
//       (both key types are cleaned up by unsubscribeFromList and unsubscribeAll)
const activeListeners: Map<string, (Unsubscribe | (() => void))[]> = new Map()

export function subscribeToList(firebaseListId: string, callbacks: ListCallbacks): () => void {
  debugLog('Sync', `subscribeToList called for: ${firebaseListId}`)

  // Cleanup existing listeners first (including any pending auth retry) to prevent duplicates
  const existing = activeListeners.get(firebaseListId)
  if (existing) {
    debugLog('Sync', `Cleaning up ${existing.length} existing listeners`)
    for (const unsub of existing) unsub()
    activeListeners.delete(firebaseListId)
  }
  const existingRetry = activeListeners.get(`${firebaseListId}__retry`)
  if (existingRetry) {
    for (const unsub of existingRetry) unsub()
    activeListeners.delete(`${firebaseListId}__retry`)
  }

  // Ensure we're signed in before subscribing
  const auth = getFirebaseAuth()
  if (!auth.currentUser) {
    debugLog('Sync', 'No auth.currentUser — signing in first...')
    let cancelled = false
    firebaseSignIn(auth)
      .then((cred) => {
        if (cancelled) return
        currentUser = cred.user
        debugLog('Sync', `Auth recovered: ${cred.user.uid}, retrying subscribe`)
        const realUnsub = subscribeToList(firebaseListId, callbacks)
        activeListeners.set(`${firebaseListId}__retry`, [realUnsub])
      })
      .catch((e) => {
        debugLog('Sync', `Auth FAILED in subscribe: ${e}`)
        console.warn('[FirebaseSyncService] Auth failed in subscribe:', e)
      })
    return () => {
      cancelled = true
      const retryUnsubs = activeListeners.get(`${firebaseListId}__retry`)
      if (retryUnsubs) {
        for (const unsub of retryUnsubs) unsub()
        activeListeners.delete(`${firebaseListId}__retry`)
      }
    }
  }

  const uid = auth.currentUser.uid
  debugLog('Sync', `Auth OK (UID=${uid}), setting up listeners...`)
  const db = getFirebaseDb()

  // Check if current UID is already a member. If not, register first then subscribe.
  // This handles the case where device got a new anonymous UID (reinstall/clear data).
  const memberRef = ref(db, `lists/${firebaseListId}/meta/members/${uid}`)
  firebaseGet(memberRef)
    .then((snap) => {
      if (!snap.exists()) {
        debugLog('Sync', `UID=${uid} not in members, registering...`)
        return set(memberRef, { joinedAt: Date.now(), deviceName: DEVICE_NAME })
          .then(() => { debugLog('Sync', 'Registered as member OK') })
          .catch((e) => { debugLog('Sync', `Register as member FAILED: ${e}`) })
      } else {
        debugLog('Sync', `UID=${uid} already a member`)
      }
    })
    .catch((e) => {
      debugLog('Sync', `Member check FAILED (permission_denied?): ${e}`)
    })

  const unsubs: Unsubscribe[] = []

  try {
    const onListenerError = (error: Error): void => {
      debugLog('Sync', `LISTENER ERROR for ${firebaseListId}: ${error.message}`)
      console.warn('[FirebaseSyncService] Listener error for list', firebaseListId, ':', error.message)
    }

    // Items listener
    const itemsPath = `lists/${firebaseListId}/items`
    debugLog('Sync', `Setting up onValue for: ${itemsPath}`)
    const itemsRef = ref(db, itemsPath)
    const itemsUnsub = onValue(
      itemsRef,
      (snap) => {
        try {
          if (!snap.exists()) {
            debugLog('Sync', `onItems: snapshot empty (no items)`)
            callbacks.onItems([])
            return
          }
          const val = snap.val() as Record<string, FirebaseItem>
          const items: ShoppingItem[] = Object.values(val)
            .map((fi) => ({
              id: fi.id,
              name: fi.name,
              quantity: fi.quantity,
              isChecked: fi.isChecked,
              order: fi.order,
              createdAt: fi.createdAt,
            }))
            .sort((a, b) => a.order - b.order)
          debugLog('Sync', `onItems: received ${items.length} items: [${items.map((i) => i.name).join(', ')}]`)
          callbacks.onItems(items)
        } catch (error) {
          debugLog('Sync', `onItems CALLBACK ERROR: ${error}`)
          console.warn('[FirebaseSyncService] Error in onItems callback:', error)
        }
      },
      onListenerError,
    )
    unsubs.push(itemsUnsub)
    debugLog('Sync', 'Items listener attached')

    // Session listener
    const sessionPath = `lists/${firebaseListId}/session`
    debugLog('Sync', `Setting up onValue for: ${sessionPath}`)
    const sessionRef = ref(db, sessionPath)
    const sessionUnsub = onValue(
      sessionRef,
      (snap) => {
        try {
          debugLog('Sync', `onSession: exists=${snap.exists()}`)
          callbacks.onSession(snap.exists() ? (snap.val() as ShoppingSession) : null)
        } catch (error) {
          debugLog('Sync', `onSession CALLBACK ERROR: ${error}`)
          console.warn('[FirebaseSyncService] Error in onSession callback:', error)
        }
      },
      onListenerError,
    )
    unsubs.push(sessionUnsub)
    debugLog('Sync', 'Session listener attached')

    // Meta listener
    const metaPath = `lists/${firebaseListId}/meta`
    debugLog('Sync', `Setting up onValue for: ${metaPath}`)
    const metaRef = ref(db, metaPath)
    const metaUnsub = onValue(
      metaRef,
      (snap) => {
        try {
          if (snap.exists()) {
            const meta = snap.val() as FirebaseListMeta
            const memberCount = meta.members ? Object.keys(meta.members).length : 0
            debugLog('Sync', `onMeta: name="${meta.name}", members=${memberCount}`)
            callbacks.onMeta(meta)
          } else {
            debugLog('Sync', 'onMeta: snapshot empty')
          }
        } catch (error) {
          debugLog('Sync', `onMeta CALLBACK ERROR: ${error}`)
          console.warn('[FirebaseSyncService] Error in onMeta callback:', error)
        }
      },
      onListenerError,
    )
    unsubs.push(metaUnsub)
    debugLog('Sync', `All 3 listeners attached for ${firebaseListId}`)

    activeListeners.set(firebaseListId, unsubs)

    return () => {
      debugLog('Sync', `Unsubscribing from ${firebaseListId}`)
      for (const unsub of unsubs) unsub()
      activeListeners.delete(firebaseListId)
    }
  } catch (error) {
    // Cleanup any partial listeners on setup failure
    for (const unsub of unsubs) unsub()
    debugLog('Sync', `SUBSCRIBE FAILED: ${error}`)
    console.warn('[FirebaseSyncService] Failed to subscribe to list:', error)
    return () => {}
  }
}

export function unsubscribeFromList(firebaseListId: string): void {
  const unsubs = activeListeners.get(firebaseListId)
  if (unsubs) {
    for (const unsub of unsubs) unsub()
    activeListeners.delete(firebaseListId)
  }
  const retryUnsubs = activeListeners.get(`${firebaseListId}__retry`)
  if (retryUnsubs) {
    for (const unsub of retryUnsubs) unsub()
    activeListeners.delete(`${firebaseListId}__retry`)
  }
}

export function unsubscribeAll(): void {
  // Iterates all entries including __retry keys — activeListeners.clear() removes everything
  for (const [, unsubs] of activeListeners) {
    for (const unsub of unsubs) unsub()
  }
  activeListeners.clear()
}

// ─── Auth guard ───
// Ensures user is authenticated before any Firebase write.
// Without this, writes fail silently with PERMISSION_DENIED if auth state was lost.
async function ensureAuth(): Promise<void> {
  const auth = getFirebaseAuth()
  if (auth.currentUser) return
  try {
    const cred = await firebaseSignIn(auth)
    currentUser = cred.user
  } catch (e) {
    console.warn('[FirebaseSyncService] ensureAuth failed:', e)
    throw new Error('Firebase auth required but sign-in failed')
  }
}

// ─── Firebase write operations ───
// NOTE: All writes use last-write-wins semantics (Firebase Realtime Database default).
// For a shopping list app this is acceptable: concurrent edits to the same item are rare,
// and the real-time listener immediately syncs the latest state to all devices.
// If conflict resolution becomes necessary, consider Firebase transactions or CRDT-based merging.

export async function firebaseSetItems(
  firebaseListId: string,
  items: ShoppingItem[],
): Promise<void> {
  await ensureAuth()
  const db = getFirebaseDb()
  const now = Date.now()
  const itemsObj: Record<string, FirebaseItem> = {}
  for (const item of items) {
    itemsObj[item.id] = {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      isChecked: item.isChecked,
      order: item.order,
      createdAt: item.createdAt,
      updatedAt: now,
    }
  }
  await set(ref(db, `lists/${firebaseListId}/items`), itemsObj)
  await update(ref(db, `lists/${firebaseListId}/meta`), { updatedAt: now })
}

export async function firebaseAddItem(
  firebaseListId: string,
  item: ShoppingItem,
): Promise<void> {
  debugLog('Write', `firebaseAddItem: "${item.name}" to ${firebaseListId}`)
  await ensureAuth()
  const db = getFirebaseDb()
  const now = Date.now()
  const firebaseItem: FirebaseItem = {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    isChecked: item.isChecked,
    order: item.order,
    createdAt: item.createdAt,
    updatedAt: now,
  }
  await set(ref(db, `lists/${firebaseListId}/items/${item.id}`), firebaseItem)
  await update(ref(db, `lists/${firebaseListId}/meta`), { updatedAt: now })
  debugLog('Write', `firebaseAddItem OK: "${item.name}"`)
}

export async function firebaseUpdateItem(
  firebaseListId: string,
  itemId: string,
  updates: Partial<FirebaseItem>,
): Promise<void> {
  await ensureAuth()
  const db = getFirebaseDb()
  const now = Date.now()
  await update(ref(db, `lists/${firebaseListId}/items/${itemId}`), { ...updates, updatedAt: now })
  await update(ref(db, `lists/${firebaseListId}/meta`), { updatedAt: now })
}

export async function firebaseBatchUpdateOrder(
  firebaseListId: string,
  items: ShoppingItem[],
): Promise<void> {
  await ensureAuth()
  const db = getFirebaseDb()
  const now = Date.now()
  const updates: Record<string, unknown> = {}
  for (const item of items) {
    updates[`lists/${firebaseListId}/items/${item.id}/order`] = item.order
    updates[`lists/${firebaseListId}/items/${item.id}/updatedAt`] = now
  }
  updates[`lists/${firebaseListId}/meta/updatedAt`] = now
  await update(ref(db), updates)
}

export async function firebaseRemoveItemsAndReorder(
  firebaseListId: string,
  removeIds: string[],
  remainingItems: ShoppingItem[],
): Promise<void> {
  await ensureAuth()
  const db = getFirebaseDb()
  const now = Date.now()
  const updates: Record<string, unknown> = {}
  for (const id of removeIds) {
    updates[`lists/${firebaseListId}/items/${id}`] = null
  }
  for (const item of remainingItems) {
    updates[`lists/${firebaseListId}/items/${item.id}/order`] = item.order
    updates[`lists/${firebaseListId}/items/${item.id}/updatedAt`] = now
  }
  updates[`lists/${firebaseListId}/meta/updatedAt`] = now
  await update(ref(db), updates)
}

export async function firebaseSetSession(
  firebaseListId: string,
  session: ShoppingSession | null,
): Promise<void> {
  await ensureAuth()
  const db = getFirebaseDb()
  const now = Date.now()
  if (session) {
    await set(ref(db, `lists/${firebaseListId}/session`), session)
  } else {
    await remove(ref(db, `lists/${firebaseListId}/session`))
  }
  await update(ref(db, `lists/${firebaseListId}/meta`), { updatedAt: now })
}

export async function firebaseAddHistory(
  firebaseListId: string,
  session: ShoppingSession,
): Promise<void> {
  await ensureAuth()
  const db = getFirebaseDb()
  const now = Date.now()
  await set(ref(db, `lists/${firebaseListId}/history/${session.id}`), session)
  await update(ref(db, `lists/${firebaseListId}/meta`), { updatedAt: now })
}

export async function firebaseRemoveHistory(
  firebaseListId: string,
  sessionId: string,
): Promise<void> {
  await ensureAuth()
  const db = getFirebaseDb()
  const now = Date.now()
  await remove(ref(db, `lists/${firebaseListId}/history/${sessionId}`))
  await update(ref(db, `lists/${firebaseListId}/meta`), { updatedAt: now })
}

export async function firebaseClearHistory(firebaseListId: string): Promise<void> {
  await ensureAuth()
  const db = getFirebaseDb()
  const now = Date.now()
  await remove(ref(db, `lists/${firebaseListId}/history`))
  await update(ref(db, `lists/${firebaseListId}/meta`), { updatedAt: now })
}

export async function firebaseUpdateListName(
  firebaseListId: string,
  name: string,
): Promise<void> {
  await ensureAuth()
  const db = getFirebaseDb()
  await update(ref(db, `lists/${firebaseListId}/meta`), { name, updatedAt: Date.now() })
}

export async function firebaseLeaveList(firebaseListId: string): Promise<void> {
  await ensureAuth()
  const uid = getCurrentUid()
  if (!uid) return
  const db = getFirebaseDb()
  await remove(ref(db, `lists/${firebaseListId}/meta/members/${uid}`))

  // Clean up entire list if no members remain
  try {
    const membersSnap = await firebaseGet(ref(db, `lists/${firebaseListId}/meta/members`))
    if (!membersSnap.exists() || Object.keys(membersSnap.val() as Record<string, unknown>).length === 0) {
      await remove(ref(db, `lists/${firebaseListId}`))
    }
  } catch {
    // Cleanup is best-effort — don't fail the leave operation
  }
}

export async function firebaseGetMemberCount(firebaseListId: string): Promise<number> {
  await ensureAuth()
  const db = getFirebaseDb()
  const snap = await firebaseGet(ref(db, `lists/${firebaseListId}/meta/members`))
  if (!snap.exists()) return 0
  return Object.keys(snap.val() as Record<string, unknown>).length
}

export async function firebaseLoadHistory(firebaseListId: string): Promise<ShoppingSession[]> {
  await ensureAuth()
  const db = getFirebaseDb()
  const snap = await firebaseGet(ref(db, `lists/${firebaseListId}/history`))
  if (!snap.exists()) return []
  const val = snap.val() as Record<string, ShoppingSession>
  return Object.values(val).sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
}
