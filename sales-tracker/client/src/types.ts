export type CategoryType = 'select' | 'yes_no_na'

export type CategoryOption = {
  id: number
  categoryId: number
  value: string
  position: number
  active: boolean
}

export type Category = {
  id: number
  name: string
  type: CategoryType
  position: number
  active: boolean
  dependsOnCategoryId: number | null
  dependsOnValue: string | null
  options: CategoryOption[]
}

export type EnrichedValue = {
  categoryId: number
  categoryName: string
  type: CategoryType
  optionId: number | null
  valueText: string | null
  displayValue: string | null
}

export type Order = {
  id: number
  date: string
  orderNumber: string
  deliveryDate: string | null
  totalAmount: number
  amountPaid: number
  notes: string | null
  createdAt: string
  updatedAt: string
  balance: number
  values: EnrichedValue[]
}

export type OrderValueInput = {
  categoryId: number
  optionId?: number | null
  valueText?: string | null
}

export type OrderInput = {
  date: string
  orderNumber: string
  deliveryDate?: string | null
  totalAmount: number
  amountPaid: number
  notes?: string | null
  values: OrderValueInput[]
}

export type LeaderboardEntry = {
  rep: string
  revenue: number
  orderCount: number
  guardsmanAttachRate: number
  upholsteryAttachRate: number
}

export type LeaderboardResponse = {
  period: string
  results: LeaderboardEntry[]
}

export type StatusFlags = {
  unpaidBalances: { orderId: number; orderNumber: string; date: string; balance: number; rep: string | null }[]
  unconfirmedDeliveries: {
    orderId: number
    orderNumber: string
    date: string
    deliveryDate: string | null
    status: string | null
    rep: string | null
  }[]
  pendingInterstateActions: {
    orderId: number
    orderNumber: string
    date: string
    actionTaken: string | null
    rep: string | null
  }[]
}
