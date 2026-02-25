import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import type { ShoppingItem, ActiveShoppingItem, ShoppingSession } from '../types/shopping'
import { debouncedPersist } from '../services/debouncedPersist'

const SESSION_KEY = '@active_shopping'
const HISTORY_KEY = '@shopping_history'

export interface ActiveShoppingStoreState {
  session: ShoppingSession | null
  showBought: boolean
  isLoaded: boolean
  isFinishing: boolean
  history: ShoppingSession[]

  load: () => Promise<void>
  loadHistory: () => Promise<void>
  startShopping: (items: ShoppingItem[]) => void
  toggleBought: (id: string) => void
  toggleShowBought: () => void
  finishShopping: () => Promise<void>
  removeSession: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
}

export const useActiveShoppingStore = create<ActiveShoppingStoreState>((set, get) => ({
  session: null,
  showBought: true,
  isLoaded: false,
  isFinishing: false,
  history: [],

  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(SESSION_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (typeof parsed !== 'object' || parsed === null || !('id' in parsed)) {
          console.warn('[ActiveShoppingStore] Invalid session data, clearing')
          await AsyncStorage.removeItem(SESSION_KEY)
          set({ isLoaded: true })
          return
        }
        set({ session: parsed as ShoppingSession, isLoaded: true })
      } else {
        set({ isLoaded: true })
      }
    } catch (error) {
      console.warn('[ActiveShoppingStore] Failed to load session:', error)
      set({ isLoaded: true })
    }
  },

  loadHistory: async () => {
    try {
      const historyRaw = await AsyncStorage.getItem(HISTORY_KEY)
      if (historyRaw) {
        const parsed: unknown = JSON.parse(historyRaw)
        if (!Array.isArray(parsed)) {
          console.warn('[ActiveShoppingStore] Invalid history data, clearing')
          await AsyncStorage.removeItem(HISTORY_KEY)
          return
        }
        const history = parsed as ShoppingSession[]
        set({ history: [...history].sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? '')) })
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
    persistSession(session)
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
    persistSession(updatedSession)
  },

  toggleShowBought: () => {
    set({ showBought: !get().showBought })
  },

  finishShopping: async () => {
    const { session, isFinishing } = get()
    if (!session || isFinishing) return

    set({ isFinishing: true })

    try {
      const finishedSession: ShoppingSession = {
        ...session,
        finishedAt: new Date().toISOString(),
      }

      const historyRaw = await AsyncStorage.getItem(HISTORY_KEY)
      const history = historyRaw ? (JSON.parse(historyRaw) as ShoppingSession[]) : []
      history.push(finishedSession)
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history))

      set({ session: null, showBought: true })
      await AsyncStorage.removeItem(SESSION_KEY)
    } catch (error) {
      console.warn('[ActiveShoppingStore] Failed to finish shopping:', error)
    } finally {
      set({ isFinishing: false })
    }
  },

  removeSession: async (id: string) => {
    const updated = get().history.filter((s) => s.id !== id)
    set({ history: updated })
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated)).catch((e) => console.warn('[ActiveShoppingStore] Failed to persist history:', e))
  },

  clearHistory: async () => {
    set({ history: [] })
    await AsyncStorage.removeItem(HISTORY_KEY).catch((e) => console.warn('[ActiveShoppingStore] Failed to clear history:', e))
  },
}))

function persistSession(session: ShoppingSession): void {
  debouncedPersist(SESSION_KEY, session)
}
