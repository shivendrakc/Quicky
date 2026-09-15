export type GuardsmanCategory = 'none' | 'sofa' | 'dining'
export type DeliveryType = 'metro' | 'interstate'
export type TierReached = 'none' | 'target' | 'tier25' | 'tier50' | 'tier75'

export type Order = {
  id: number
  storeId: number
  date: string
  consultant: string
  orderNo: string
  casegoods: boolean
  dining: boolean
  upholstery: boolean
  guardsmanCategory: GuardsmanCategory
  declineSku: boolean
  mto: boolean
  delType: DeliveryType
  total: number
  deposit: number
  paymentType: string | null
  attentionRequired: boolean
  notes: string | null
  loggedAt: string
  checkedAt: string | null
  updatedAt: string
}

export type OrderInput = {
  date: string
  consultant: string
  orderNo: string
  casegoods: boolean
  dining: boolean
  upholstery: boolean
  guardsmanCategory: GuardsmanCategory
  declineSku: boolean
  mto: boolean
  delType: DeliveryType
  total: number
  deposit: number
  paymentType: string | null
  attentionRequired: boolean
  notes: string | null
}

export type ReviewStatus = 'red' | 'yellow' | 'none' | 'green'

export type Store = {
  id: number
  name: string
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
  hurdlePct: number
  effectiveFrom: string
}

export type StaffLoading = {
  id: number
  storeId: number
  staff: string
  loadingPct: number
  effectiveFrom: string
}

export type StaffShift = {
  id: number
  storeId: number
  staff: string
  year: number
  month: number
  weekdayShifts: number
  weekendShifts: number
  hoursWorked: number
}

export type StaffMonthlyTargetSnapshot = {
  id: number
  storeId: number
  staff: string
  year: number
  month: number
  weekdayShifts: number
  weekendShifts: number
  weekdayWeight: number
  weekendWeight: number
  hurdlePct: number
  loadingPct: number
  baseIndividualTarget: number
  finalIndividualTarget: number
  tier25: number
  tier50: number
  tier75: number
}

export type DailySales = {
  date: string
  total: number
  orderCount: number
}

export type CategoryBreakdown = {
  casegoods: number
  dining: number
  upholstery: number
  guardsmanSofa: number
  guardsmanDining: number
}

// Actual vs. target for one staff member over an arbitrary date range (FY / quarter /
// month / week / day, or the current month/quarter for the Rep dashboard). Computed live
// from orders + the nearest staff_monthly_target_snapshots rows — never stored.
export type RepRangeStats = {
  staff: string
  actual: number
  target: number | null
  pctToTarget: number | null
  tierReached: TierReached
  commissionEarned: number
  upholsteryCount: number
  guardsmanUphCount: number // Guardsman attached to Upholstery (sofa)
  guardsmanDtCount: number // Guardsman attached to Dining
  guardsmanCommission: number
}

export type StorePeriodStats = {
  actual: number
  target: number | null
  pctToTarget: number | null
}
