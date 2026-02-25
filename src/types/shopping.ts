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
  purchasedAt: string | null
}

export interface ShoppingSession {
  id: string
  items: ActiveShoppingItem[]
  startedAt: string
  finishedAt: string | null
}

export interface ShoppingListMeta {
  id: string
  name: string
  createdAt: string
  isShared: boolean
  shareCode: string | null
  firebaseListId: string | null
  ownerDeviceId: string | null
}

export interface ListsMetaData {
  version: 1
  lists: ShoppingListMeta[]
  selectedListId: string
  deviceId: string
}
