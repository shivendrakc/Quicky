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

export type Store = {
  id: number
  name: string
  active: boolean
}

export type MonthlyTarget = {
  id: number
  storeId: number
  year: number
  month: number
  agreedTarget: number
}

export type ShiftWeightSettings = {
  id: number
  storeId: number
  weekdayWeight: number
  weekendWeight: number
  effectiveFrom: string
}

export type StaffShift = {
  id: number
  storeId: number
  repOptionId: number
  repName: string
  year: number
  month: number
  weekdayShifts: number
  weekendShifts: number
}

export type StaffMonthlyTargetSnapshot = {
  id: number
  storeId: number
  repOptionId: number
  repName: string
  year: number
  month: number
  weekdayShifts: number
  weekendShifts: number
  weekdayWeight: number
  weekendWeight: number
  individualTarget: number
  tier25: number
  tier50: number
  tier75: number
}

export type DailySales = {
  date: string
  total: number
  orderCount: number
}

export type RepMonthlyStats = {
  repOptionId: number
  repName: string
  year: number
  month: number
  actualSales: number
  individualTarget: number | null
  tier25: number | null
  tier50: number | null
  tier75: number | null
  tierReached: 'none' | 'target' | 'tier25' | 'tier50' | 'tier75'
  monthlyCommission: number
  guardsmanCount: number
  guardsmanCommission: number
}

export type RepQuarterlyBonus = {
  repOptionId: number
  repName: string
  fyStartYear: number
  quarter: 1 | 2 | 3 | 4
  actualSales: number
  cumulativeTarget: number | null
  tierReached: 'none' | 'target' | 'tier25' | 'tier50' | 'tier75'
  bonusRate: number
  bonusAmount: number
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
