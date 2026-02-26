import { signInAnonymously as firebaseSignIn, onAuthStateChanged, type User } from 'firebase/auth'
import {
  ref,
  set,
  push,
  remove,
  update,
  onValue,
  off,
  get as firebaseGet,
  serverTimestamp,
  type Unsubscribe,
  type DatabaseReference,
} from 'firebase/database'
import { getFirebaseAuth, getFirebaseDb } from './firebaseConfig'
import type { ShoppingItem, ActiveShoppingItem, ShoppingSession } from '../types/shopping'

// ─── Sharing code charset (30 chars: no O/0/I/1/L) ───
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
const CODE_EXPIRY_MS = 15 * 60 * 1000 // 15 minutes

// ─── Firebase data shapes ───
export interface FirebaseListMeta {
  name: string
  createdAt: number
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
  const auth = getFirebaseAuth()
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      unsub()
      console.warn('[FirebaseSyncService] Auth init timeout (10s), continuing without auth')
      resolve()
    }, 10_000)

    const unsub = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout)
      currentUser = user
      unsub()
      resolve()
    })
  })
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

  const meta: FirebaseListMeta = {
    name,
    createdAt: Date.now(),
    createdBy: uid,
    members: {
      [uid]: { joinedAt: Date.now(), deviceName },
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
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSharingCode()
    const existingSnap = await firebaseGet(ref(db, `sharing-codes/${code}`))
    if (existingSnap.exists()) continue

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

  throw new Error('Failed to generate unique sharing code after 5 attempts')
}

export async function joinSharedList(
  code: string,
  deviceName: string,
): Promise<{ firebaseListId: string; listName: string } | null> {
  const uid = await signInAnonymously()
  const db = getFirebaseDb()

  const codeSnap = await firebaseGet(ref(db, `sharing-codes/${code.toUpperCase()}`))
  if (!codeSnap.exists()) return null

  const data = codeSnap.val() as FirebaseSharingCode
  if (Date.now() > data.expiresAt) {
    // Clean up expired code
    await remove(ref(db, `sharing-codes/${code.toUpperCase()}`)).catch(() => {})
    return null
  }

  // Add device as member
  await set(ref(db, `lists/${data.firebaseListId}/meta/members/${uid}`), {
    joinedAt: Date.now(),
    deviceName,
  })

  // Remove used sharing code
  await remove(ref(db, `sharing-codes/${code.toUpperCase()}`))

  return { firebaseListId: data.firebaseListId, listName: data.listName }
}

// ─── Real-time listeners ───

interface ListCallbacks {
  onItems: (items: ShoppingItem[]) => void
  onSession: (session: ShoppingSession | null) => void
  onMeta: (meta: FirebaseListMeta) => void
}

const activeListeners: Map<string, Unsubscribe[]> = new Map()

export function subscribeToList(firebaseListId: string, callbacks: ListCallbacks): () => void {
  // Cleanup existing listeners first to prevent duplicates
  const existing = activeListeners.get(firebaseListId)
  if (existing) {
    for (const unsub of existing) unsub()
    activeListeners.delete(firebaseListId)
  }

  const db = getFirebaseDb()
  const unsubs: Unsubscribe[] = []

  try {
    // Items listener
    const itemsRef = ref(db, `lists/${firebaseListId}/items`)
    const itemsUnsub = onValue(itemsRef, (snap) => {
      try {
        if (!snap.exists()) {
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
        callbacks.onItems(items)
      } catch (error) {
        console.warn('[FirebaseSyncService] Error in onItems callback:', error)
      }
    })
    unsubs.push(itemsUnsub)

    // Session listener
    const sessionRef = ref(db, `lists/${firebaseListId}/session`)
    const sessionUnsub = onValue(sessionRef, (snap) => {
      try {
        callbacks.onSession(snap.exists() ? (snap.val() as ShoppingSession) : null)
      } catch (error) {
        console.warn('[FirebaseSyncService] Error in onSession callback:', error)
      }
    })
    unsubs.push(sessionUnsub)

    // Meta listener
    const metaRef = ref(db, `lists/${firebaseListId}/meta`)
    const metaUnsub = onValue(metaRef, (snap) => {
      try {
        if (snap.exists()) {
          callbacks.onMeta(snap.val() as FirebaseListMeta)
        }
      } catch (error) {
        console.warn('[FirebaseSyncService] Error in onMeta callback:', error)
      }
    })
    unsubs.push(metaUnsub)

    activeListeners.set(firebaseListId, unsubs)

    return () => {
      for (const unsub of unsubs) unsub()
      activeListeners.delete(firebaseListId)
    }
  } catch (error) {
    // Cleanup any partial listeners on setup failure
    for (const unsub of unsubs) unsub()
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
}

export function unsubscribeAll(): void {
  for (const [, unsubs] of activeListeners) {
    for (const unsub of unsubs) unsub()
  }
  activeListeners.clear()
}

// ─── Firebase write operations ───

export async function firebaseSetItems(
  firebaseListId: string,
  items: ShoppingItem[],
): Promise<void> {
  const db = getFirebaseDb()
  const itemsObj: Record<string, FirebaseItem> = {}
  for (const item of items) {
    itemsObj[item.id] = {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      isChecked: item.isChecked,
      order: item.order,
      createdAt: item.createdAt,
    }
  }
  await set(ref(db, `lists/${firebaseListId}/items`), itemsObj)
}

export async function firebaseAddItem(
  firebaseListId: string,
  item: ShoppingItem,
): Promise<void> {
  const db = getFirebaseDb()
  const firebaseItem: FirebaseItem = {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    isChecked: item.isChecked,
    order: item.order,
    createdAt: item.createdAt,
  }
  await set(ref(db, `lists/${firebaseListId}/items/${item.id}`), firebaseItem)
}

export async function firebaseRemoveItem(
  firebaseListId: string,
  itemId: string,
): Promise<void> {
  const db = getFirebaseDb()
  await remove(ref(db, `lists/${firebaseListId}/items/${itemId}`))
}

export async function firebaseUpdateItem(
  firebaseListId: string,
  itemId: string,
  updates: Partial<FirebaseItem>,
): Promise<void> {
  const db = getFirebaseDb()
  await update(ref(db, `lists/${firebaseListId}/items/${itemId}`), updates)
}

export async function firebaseBatchUpdateOrder(
  firebaseListId: string,
  items: ShoppingItem[],
): Promise<void> {
  const db = getFirebaseDb()
  const updates: Record<string, number> = {}
  for (const item of items) {
    updates[`lists/${firebaseListId}/items/${item.id}/order`] = item.order
  }
  await update(ref(db), updates)
}

export async function firebaseRemoveItemsAndReorder(
  firebaseListId: string,
  removeIds: string[],
  remainingItems: ShoppingItem[],
): Promise<void> {
  const db = getFirebaseDb()
  const updates: Record<string, unknown> = {}
  for (const id of removeIds) {
    updates[`lists/${firebaseListId}/items/${id}`] = null
  }
  for (const item of remainingItems) {
    updates[`lists/${firebaseListId}/items/${item.id}/order`] = item.order
  }
  await update(ref(db), updates)
}

export async function firebaseSetSession(
  firebaseListId: string,
  session: ShoppingSession | null,
): Promise<void> {
  const db = getFirebaseDb()
  if (session) {
    await set(ref(db, `lists/${firebaseListId}/session`), session)
  } else {
    await remove(ref(db, `lists/${firebaseListId}/session`))
  }
}

export async function firebaseAddHistory(
  firebaseListId: string,
  session: ShoppingSession,
): Promise<void> {
  const db = getFirebaseDb()
  await set(ref(db, `lists/${firebaseListId}/history/${session.id}`), session)
}

export async function firebaseRemoveHistory(
  firebaseListId: string,
  sessionId: string,
): Promise<void> {
  const db = getFirebaseDb()
  await remove(ref(db, `lists/${firebaseListId}/history/${sessionId}`))
}

export async function firebaseClearHistory(firebaseListId: string): Promise<void> {
  const db = getFirebaseDb()
  await remove(ref(db, `lists/${firebaseListId}/history`))
}

export async function firebaseUpdateListName(
  firebaseListId: string,
  name: string,
): Promise<void> {
  const db = getFirebaseDb()
  await update(ref(db, `lists/${firebaseListId}/meta`), { name })
}

export async function firebaseLeaveList(firebaseListId: string): Promise<void> {
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
  const db = getFirebaseDb()
  const snap = await firebaseGet(ref(db, `lists/${firebaseListId}/meta/members`))
  if (!snap.exists()) return 0
  return Object.keys(snap.val() as Record<string, unknown>).length
}

export async function firebaseLoadHistory(firebaseListId: string): Promise<ShoppingSession[]> {
  const db = getFirebaseDb()
  const snap = await firebaseGet(ref(db, `lists/${firebaseListId}/history`))
  if (!snap.exists()) return []
  const val = snap.val() as Record<string, ShoppingSession>
  return Object.values(val).sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))
}
