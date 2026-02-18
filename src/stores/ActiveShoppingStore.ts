import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'
import type { ShoppingItem, ActiveShoppingItem, ShoppingSession } from '../types/shopping'

const SESSION_KEY = '@active_shopping'
const HISTORY_KEY = '@shopping_history'

export interface ActiveShoppingStoreState {
  session: ShoppingSession | null
  showBought: boolean
  isLoaded: boolean
  history: ShoppingSession[]

  load: () => Promise<void>
  loadHistory: () => Promise<void>
  startShopping: (items: ShoppingItem[]) => void
  toggleBought: (id: string) => void
  toggleShowBought: () => void
  finishShopping: () => Promise<void>
  clearHistory: () => Promise<void>
}

export const useActiveShoppingStore = create<ActiveShoppingStoreState>((set, get) => ({
  session: null,
  showBought: true,
  isLoaded: false,
  history: [],

  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(SESSION_KEY)
      if (saved) {
        const session = JSON.parse(saved) as ShoppingSession
        set({ session, isLoaded: true })
      } else {
        set({ isLoaded: true })
      }
    } catch {
      set({ isLoaded: true })
    }
  },

  loadHistory: async () => {
    try {
      const historyRaw = await AsyncStorage.getItem(HISTORY_KEY)
      if (historyRaw) {
        const history = JSON.parse(historyRaw) as ShoppingSession[]
        set({ history: history.sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? '')) })
      }
    } catch {
      // Ignore
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
    const { session } = get()
    if (!session) return

    const finishedSession: ShoppingSession = {
      ...session,
      finishedAt: new Date().toISOString(),
    }

    // Save to history
    try {
      const historyRaw = await AsyncStorage.getItem(HISTORY_KEY)
      const history = historyRaw ? (JSON.parse(historyRaw) as ShoppingSession[]) : []
      history.push(finishedSession)
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    } catch {
      // History save failed, continue anyway
    }

    // Clear active session
    set({ session: null, showBought: true })
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => {})
  },

  clearHistory: async () => {
    set({ history: [] })
    await AsyncStorage.removeItem(HISTORY_KEY).catch(() => {})
  },
}))

function persistSession(session: ShoppingSession): void {
  AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)).catch(() => {})
}
