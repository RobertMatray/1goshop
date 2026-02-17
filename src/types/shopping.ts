export interface ShoppingItem {
  id: string
  name: string
  quantity: number
  isChecked: boolean
  order: number
  createdAt: string
}

export interface ActiveShoppingItem {
  id: string
  name: string
  quantity: number
  isBought: boolean
  order: number
}

export interface ShoppingSession {
  id: string
  items: ActiveShoppingItem[]
  startedAt: string
  finishedAt: string | null
}
