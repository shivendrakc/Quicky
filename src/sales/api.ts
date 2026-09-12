import { supabase } from '../lib/supabase'
import type {
  Category,
  CategoryType,
  DailySales,
  EnrichedValue,
  LeaderboardResponse,
  MonthlyTarget,
  Order,
  OrderInput,
  RepMonthlyStats,
  RepQuarterlyBonus,
  ShiftWeightSettings,
  StaffShift,
  StatusFlags,
  Store,
} from './types'
import { monthDateRange, monthsOfQuarter } from './tracker/financialYear'
import {
  computeGuardsmanCommission,
  computeIndividualTargets,
  computeMonthlyCommission,
  computeQuarterlyBonus,
  computeTiers,
  tierReached,
} from './tracker/commission'

// Drop-in replacement for the old fetch('/api/...') client.
// Same exported shape (`api.getCategories()`, `api.createOrder()`, etc.) as before —
// no changes needed in OrderWizard.tsx, EntryView.tsx, or the audit views.
// Talks to Supabase directly, matching QuickShip's architecture: no backend server.

type CategoryRow = {
  id: number
  name: string
  type: CategoryType
  position: number
  active: boolean
  depends_on_category_id: number | null
  depends_on_value: string | null
}

type CategoryOptionRow = {
  id: number
  category_id: number
  value: string
  position: number
  active: boolean
}

type OrderRow = {
  id: number
  date: string
  order_number: string
  delivery_date: string | null
  total_amount: number | string
  amount_paid: number | string
  notes: string | null
  created_at: string
  updated_at: string
}

type OrderValueRow = {
  id: number
  order_id: number
  category_id: number
  option_id: number | null
  value_text: string | null
}

type StoreRow = { id: number; name: string; active: boolean }

type MonthlyTargetRow = {
  id: number
  store_id: number
  year: number
  month: number
  agreed_target: number | string
}

type ShiftWeightSettingsRow = {
  id: number
  store_id: number
  weekday_weight: number | string
  weekend_weight: number | string
  effective_from: string
}

type StaffShiftRow = {
  id: number
  store_id: number
  rep_option_id: number
  year: number
  month: number
  weekday_shifts: number
  weekend_shifts: number
}

type SnapshotRow = {
  id: number
  store_id: number
  rep_option_id: number
  year: number
  month: number
  weekday_shifts: number
  weekend_shifts: number
  weekday_weight: number | string
  weekend_weight: number | string
  individual_target: number | string
  tier_25: number | string
  tier_50: number | string
  tier_75: number | string
}

type Period = 'today' | 'week' | 'month' | 'all'

function periodStart(period: Period): string | null {
  const now = new Date()
  if (period === 'all') return null
  if (period === 'today') return now.toISOString().slice(0, 10)
  const daysBack = period === 'week' ? 7 : 30
  const d = new Date(now)
  d.setDate(d.getDate() - daysBack)
  return d.toISOString().slice(0, 10)
}

function mapOption(o: CategoryOptionRow) {
  return { id: o.id, categoryId: o.category_id, value: o.value, position: o.position, active: o.active }
}

function mapCategory(c: CategoryRow, options: CategoryOptionRow[]): Category {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    position: c.position,
    active: c.active,
    dependsOnCategoryId: c.depends_on_category_id,
    dependsOnValue: c.depends_on_value,
    options: options
      .filter((o) => o.category_id === c.id)
      .sort((a, b) => a.position - b.position)
      .map(mapOption),
  }
}

async function fetchAllCategories(): Promise<{ categories: CategoryRow[]; options: CategoryOptionRow[] }> {
  const [catRes, optRes] = await Promise.all([
    supabase.from('categories').select('*'),
    supabase.from('category_options').select('*'),
  ])
  if (catRes.error) throw catRes.error
  if (optRes.error) throw optRes.error
  return { categories: (catRes.data ?? []) as CategoryRow[], options: (optRes.data ?? []) as CategoryOptionRow[] }
}

function enrichValues(rawValues: OrderValueRow[], categories: CategoryRow[], options: CategoryOptionRow[]): EnrichedValue[] {
  const categoriesById = new Map(categories.map((c) => [c.id, c]))
  const optionsById = new Map(options.map((o) => [o.id, o]))
  return rawValues.map((v) => {
    const category = categoriesById.get(v.category_id)
    const option = v.option_id != null ? optionsById.get(v.option_id) : undefined
    return {
      categoryId: v.category_id,
      categoryName: category?.name ?? 'Unknown',
      type: (category?.type ?? 'yes_no_na') as CategoryType,
      optionId: v.option_id,
      valueText: v.value_text,
      displayValue: option ? option.value : v.value_text,
    }
  })
}

function mapOrder(o: OrderRow, values: EnrichedValue[]): Order {
  const total = Number(o.total_amount)
  const paid = Number(o.amount_paid)
  return {
    id: o.id,
    date: o.date,
    orderNumber: o.order_number,
    deliveryDate: o.delivery_date,
    totalAmount: total,
    amountPaid: paid,
    notes: o.notes,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    balance: total - paid,
    values,
  }
}

function valueByCategoryOf(order: Order): Record<string, string | null> {
  const map: Record<string, string | null> = {}
  for (const v of order.values) map[v.categoryName] = v.displayValue
  return map
}

async function loadEnrichedOrders(): Promise<Order[]> {
  const [{ categories, options }, ordersRes, valuesRes] = await Promise.all([
    fetchAllCategories(),
    supabase.from('orders').select('*'),
    supabase.from('order_values').select('*'),
  ])
  if (ordersRes.error) throw ordersRes.error
  if (valuesRes.error) throw valuesRes.error

  const orderRows = (ordersRes.data ?? []) as OrderRow[]
  const valueRows = (valuesRes.data ?? []) as OrderValueRow[]

  return orderRows.map((o) =>
    mapOrder(o, enrichValues(valueRows.filter((v) => v.order_id === o.id), categories, options))
  )
}

const SALES_REP_CATEGORY_NAME = 'Sales Rep'
const GUARDSMAN_CATEGORY_NAME = 'Guardsman Insurance Sold'

async function fetchSalesRepOptions(): Promise<{ id: number; name: string }[]> {
  const { categories, options } = await fetchAllCategories()
  const repCategory = categories.find((c) => c.name === SALES_REP_CATEGORY_NAME)
  if (!repCategory) return []
  return options
    .filter((o) => o.category_id === repCategory.id && o.active)
    .sort((a, b) => a.position - b.position)
    .map((o) => ({ id: o.id, name: o.value }))
}

async function ordersInRange(start: string, end: string): Promise<Order[]> {
  const orders = await loadEnrichedOrders()
  return orders.filter((o) => o.date >= start && o.date <= end)
}

function actualSalesByRep(orders: Order[]): Map<string, { revenue: number; guardsmanCount: number }> {
  const byRep = new Map<string, { revenue: number; guardsmanCount: number }>()
  for (const order of orders) {
    const values = valueByCategoryOf(order)
    const rep = values[SALES_REP_CATEGORY_NAME] || 'Unassigned'
    const entry = byRep.get(rep) ?? { revenue: 0, guardsmanCount: 0 }
    entry.revenue += order.totalAmount
    if (values[GUARDSMAN_CATEGORY_NAME] === 'yes') entry.guardsmanCount += 1
    byRep.set(rep, entry)
  }
  return byRep
}

function mapStore(s: StoreRow): Store {
  return { id: s.id, name: s.name, active: s.active }
}

function mapMonthlyTarget(t: MonthlyTargetRow): MonthlyTarget {
  return { id: t.id, storeId: t.store_id, year: t.year, month: t.month, agreedTarget: Number(t.agreed_target) }
}

function mapShiftWeightSettings(s: ShiftWeightSettingsRow): ShiftWeightSettings {
  return {
    id: s.id,
    storeId: s.store_id,
    weekdayWeight: Number(s.weekday_weight),
    weekendWeight: Number(s.weekend_weight),
    effectiveFrom: s.effective_from,
  }
}

function mapStaffShift(s: StaffShiftRow, repName: string): StaffShift {
  return {
    id: s.id,
    storeId: s.store_id,
    repOptionId: s.rep_option_id,
    repName,
    year: s.year,
    month: s.month,
    weekdayShifts: s.weekday_shifts,
    weekendShifts: s.weekend_shifts,
  }
}

async function getActiveShiftWeightSettings(storeId: number, onOrBefore: string): Promise<ShiftWeightSettings | null> {
  const { data, error } = await supabase
    .from('shift_weight_settings')
    .select('*')
    .eq('store_id', storeId)
    .lte('effective_from', onOrBefore)
    .order('effective_from', { ascending: false })
    .limit(1)
  if (error) throw error
  const row = (data ?? [])[0] as ShiftWeightSettingsRow | undefined
  return row ? mapShiftWeightSettings(row) : null
}

async function recalcSnapshotsForPeriod(storeId: number, year: number, month: number): Promise<void> {
  const { data: targetRows, error: targetErr } = await supabase
    .from('monthly_targets')
    .select('*')
    .eq('store_id', storeId)
    .eq('year', year)
    .eq('month', month)
    .limit(1)
  if (targetErr) throw targetErr
  const target = (targetRows ?? [])[0] as MonthlyTargetRow | undefined
  if (!target) return

  const { data: shiftRows, error: shiftErr } = await supabase
    .from('staff_shifts')
    .select('*')
    .eq('store_id', storeId)
    .eq('year', year)
    .eq('month', month)
  if (shiftErr) throw shiftErr
  const shifts = (shiftRows ?? []) as StaffShiftRow[]
  if (shifts.length === 0) return

  const { start } = monthDateRange(year, month)
  const weights = await getActiveShiftWeightSettings(storeId, start)
  const weekdayWeight = weights?.weekdayWeight ?? 1
  const weekendWeight = weights?.weekendWeight ?? 1

  const individualTargets = computeIndividualTargets(
    Number(target.agreed_target),
    shifts.map((s) => ({ repOptionId: s.rep_option_id, weekdayShifts: s.weekday_shifts, weekendShifts: s.weekend_shifts })),
    weekdayWeight,
    weekendWeight
  )

  const snapshotRows = shifts.map((s) => {
    const individualTarget = individualTargets.get(s.rep_option_id) ?? 0
    const tiers = computeTiers(individualTarget)
    return {
      store_id: storeId,
      rep_option_id: s.rep_option_id,
      year,
      month,
      weekday_shifts: s.weekday_shifts,
      weekend_shifts: s.weekend_shifts,
      weekday_weight: weekdayWeight,
      weekend_weight: weekendWeight,
      individual_target: individualTarget,
      tier_25: tiers.tier25,
      tier_50: tiers.tier50,
      tier_75: tiers.tier75,
      calculated_at: new Date().toISOString(),
    }
  })

  const { error: upsertErr } = await supabase
    .from('staff_monthly_target_snapshots')
    .upsert(snapshotRows, { onConflict: 'store_id,rep_option_id,year,month' })
  if (upsertErr) throw upsertErr
}

export const api = {
  getCategories: async (): Promise<Category[]> => {
    const { categories, options } = await fetchAllCategories()
    return categories.sort((a, b) => a.position - b.position).map((c) => mapCategory(c, options))
  },

  createCategory: async (name: string, type: CategoryType): Promise<Category> => {
    const { data: existing, error: exErr } = await supabase.from('categories').select('position')
    if (exErr) throw exErr
    const nextPosition = (existing ?? []).reduce((max, c) => Math.max(max, c.position), -1) + 1
    const { data, error } = await supabase
      .from('categories')
      .insert({ name, type, position: nextPosition })
      .select()
      .single()
    if (error) throw error
    return mapCategory(data as CategoryRow, [])
  },

  updateCategory: async (
    id: number,
    updates: Partial<Pick<Category, 'name' | 'position' | 'active'>>
  ): Promise<Category> => {
    const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single()
    if (error) throw error
    const { options } = await fetchAllCategories()
    return mapCategory(data as CategoryRow, options)
  },

  createOption: async (categoryId: number, value: string) => {
    const { data: existing, error: exErr } = await supabase
      .from('category_options')
      .select('position')
      .eq('category_id', categoryId)
    if (exErr) throw exErr
    const nextPosition = (existing ?? []).reduce((max, o) => Math.max(max, o.position), -1) + 1
    const { data, error } = await supabase
      .from('category_options')
      .insert({ category_id: categoryId, value, position: nextPosition })
      .select()
      .single()
    if (error) throw error
    return mapOption(data as CategoryOptionRow)
  },

  updateOption: async (_categoryId: number, optionId: number, updates: { value?: string; active?: boolean }) => {
    const { data, error } = await supabase
      .from('category_options')
      .update(updates)
      .eq('id', optionId)
      .select()
      .single()
    if (error) throw error
    return mapOption(data as CategoryOptionRow)
  },

  getOrders: async (): Promise<Order[]> => {
    const orders = await loadEnrichedOrders()
    return orders.sort((a, b) => (a.date < b.date ? 1 : -1))
  },

  getOrder: async (id: number): Promise<Order> => {
    const [{ categories, options }, orderRes, valuesRes] = await Promise.all([
      fetchAllCategories(),
      supabase.from('orders').select('*').eq('id', id).single(),
      supabase.from('order_values').select('*').eq('order_id', id),
    ])
    if (orderRes.error) throw orderRes.error
    if (valuesRes.error) throw valuesRes.error
    const values = enrichValues((valuesRes.data ?? []) as OrderValueRow[], categories, options)
    return mapOrder(orderRes.data as OrderRow, values)
  },

  createOrder: async (input: OrderInput): Promise<Order> => {
    const { data: created, error } = await supabase
      .from('orders')
      .insert({
        date: input.date,
        order_number: input.orderNumber,
        delivery_date: input.deliveryDate ?? null,
        total_amount: input.totalAmount ?? 0,
        amount_paid: input.amountPaid ?? 0,
        notes: input.notes ?? null,
      })
      .select()
      .single()
    if (error) throw error

    const rows = (input.values ?? []).map((v) => ({
      order_id: created.id,
      category_id: v.categoryId,
      option_id: v.optionId ?? null,
      value_text: v.valueText ?? null,
    }))
    if (rows.length > 0) {
      const { error: valErr } = await supabase.from('order_values').insert(rows)
      if (valErr) throw valErr
    }

    return api.getOrder(created.id)
  },

  updateOrder: async (id: number, input: OrderInput): Promise<Order> => {
    const { error: updErr } = await supabase
      .from('orders')
      .update({
        date: input.date,
        order_number: input.orderNumber,
        delivery_date: input.deliveryDate ?? null,
        total_amount: input.totalAmount ?? 0,
        amount_paid: input.amountPaid ?? 0,
        notes: input.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (updErr) throw updErr

    const { error: delErr } = await supabase.from('order_values').delete().eq('order_id', id)
    if (delErr) throw delErr

    const rows = (input.values ?? []).map((v) => ({
      order_id: id,
      category_id: v.categoryId,
      option_id: v.optionId ?? null,
      value_text: v.valueText ?? null,
    }))
    if (rows.length > 0) {
      const { error: valErr } = await supabase.from('order_values').insert(rows)
      if (valErr) throw valErr
    }

    return api.getOrder(id)
  },

  deleteOrder: async (id: number): Promise<void> => {
    // order_values rows cascade-delete via the FK's ON DELETE CASCADE
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (error) throw error
  },

  getLeaderboard: async (period: string): Promise<LeaderboardResponse> => {
    const start = periodStart(period as Period)
    const orders = (await loadEnrichedOrders()).filter((o) => !start || o.date >= start)

    const byRep = new Map<
      string,
      { rep: string; revenue: number; orderCount: number; guardsmanYes: number; upholsteryYes: number }
    >()

    for (const order of orders) {
      const values = valueByCategoryOf(order)
      const rep = values['Sales Rep'] || 'Unassigned'
      const entry = byRep.get(rep) ?? { rep, revenue: 0, orderCount: 0, guardsmanYes: 0, upholsteryYes: 0 }
      entry.revenue += order.totalAmount
      entry.orderCount += 1
      if (values['Guardsman Insurance Sold'] === 'yes') entry.guardsmanYes += 1
      if (values['Upholstery'] === 'yes') entry.upholsteryYes += 1
      byRep.set(rep, entry)
    }

    const results = Array.from(byRep.values())
      .map((e) => ({
        rep: e.rep,
        revenue: e.revenue,
        orderCount: e.orderCount,
        guardsmanAttachRate: e.orderCount ? e.guardsmanYes / e.orderCount : 0,
        upholsteryAttachRate: e.orderCount ? e.upholsteryYes / e.orderCount : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    return { period, results }
  },

  getStatusFlags: async (): Promise<StatusFlags> => {
    const orders = await loadEnrichedOrders()

    const unpaidBalances = orders
      .filter((o) => o.balance > 0)
      .map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        date: o.date,
        balance: o.balance,
        rep: valueByCategoryOf(o)['Sales Rep'] ?? null,
      }))

    const unconfirmedDeliveries = orders
      .filter((o) => valueByCategoryOf(o)['Delivery Confirmed'] !== 'yes')
      .map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        date: o.date,
        deliveryDate: o.deliveryDate,
        status: valueByCategoryOf(o)['Delivery Confirmed'] ?? null,
        rep: valueByCategoryOf(o)['Sales Rep'] ?? null,
      }))

    const pendingInterstateActions = orders
      .filter(
        (o) =>
          valueByCategoryOf(o)['Interstate Transfer Needed'] === 'yes' &&
          valueByCategoryOf(o)['Action Taken'] !== 'yes'
      )
      .map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        date: o.date,
        actionTaken: valueByCategoryOf(o)['Action Taken'] ?? null,
        rep: valueByCategoryOf(o)['Sales Rep'] ?? null,
      }))

    return { unpaidBalances, unconfirmedDeliveries, pendingInterstateActions }
  },

  getStores: async (): Promise<Store[]> => {
    const { data, error } = await supabase.from('stores').select('*').order('id')
    if (error) throw error
    return ((data ?? []) as StoreRow[]).map(mapStore)
  },

  getDefaultStore: async (): Promise<Store> => {
    const stores = await api.getStores()
    const store = stores.find((s) => s.active) ?? stores[0]
    if (!store) throw new Error('No store configured. Insert a row into the stores table first.')
    return store
  },

  getSalesReps: fetchSalesRepOptions,

  getMonthlyTarget: async (storeId: number, year: number, month: number): Promise<MonthlyTarget | null> => {
    const { data, error } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('store_id', storeId)
      .eq('year', year)
      .eq('month', month)
      .limit(1)
    if (error) throw error
    const row = (data ?? [])[0] as MonthlyTargetRow | undefined
    return row ? mapMonthlyTarget(row) : null
  },

  upsertMonthlyTarget: async (storeId: number, year: number, month: number, agreedTarget: number): Promise<MonthlyTarget> => {
    const { data, error } = await supabase
      .from('monthly_targets')
      .upsert(
        { store_id: storeId, year, month, agreed_target: agreedTarget, updated_at: new Date().toISOString() },
        { onConflict: 'store_id,year,month' }
      )
      .select()
      .single()
    if (error) throw error
    await recalcSnapshotsForPeriod(storeId, year, month)
    return mapMonthlyTarget(data as MonthlyTargetRow)
  },

  getShiftWeightSettings: async (storeId: number): Promise<ShiftWeightSettings[]> => {
    const { data, error } = await supabase
      .from('shift_weight_settings')
      .select('*')
      .eq('store_id', storeId)
      .order('effective_from', { ascending: false })
    if (error) throw error
    return ((data ?? []) as ShiftWeightSettingsRow[]).map(mapShiftWeightSettings)
  },

  addShiftWeightSettings: async (
    storeId: number,
    weekdayWeight: number,
    weekendWeight: number,
    effectiveFrom: string
  ): Promise<ShiftWeightSettings> => {
    const { data, error } = await supabase
      .from('shift_weight_settings')
      .insert({ store_id: storeId, weekday_weight: weekdayWeight, weekend_weight: weekendWeight, effective_from: effectiveFrom })
      .select()
      .single()
    if (error) throw error
    return mapShiftWeightSettings(data as ShiftWeightSettingsRow)
  },

  getStaffShifts: async (storeId: number, year: number, month: number): Promise<StaffShift[]> => {
    const [reps, shiftsRes] = await Promise.all([
      fetchSalesRepOptions(),
      supabase.from('staff_shifts').select('*').eq('store_id', storeId).eq('year', year).eq('month', month),
    ])
    if (shiftsRes.error) throw shiftsRes.error
    const repsById = new Map(reps.map((r) => [r.id, r.name]))
    return ((shiftsRes.data ?? []) as StaffShiftRow[]).map((s) => mapStaffShift(s, repsById.get(s.rep_option_id) ?? 'Unknown'))
  },

  upsertStaffShift: async (
    storeId: number,
    repOptionId: number,
    year: number,
    month: number,
    weekdayShifts: number,
    weekendShifts: number
  ): Promise<void> => {
    const { error } = await supabase.from('staff_shifts').upsert(
      {
        store_id: storeId,
        rep_option_id: repOptionId,
        year,
        month,
        weekday_shifts: weekdayShifts,
        weekend_shifts: weekendShifts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id,rep_option_id,year,month' }
    )
    if (error) throw error
    await recalcSnapshotsForPeriod(storeId, year, month)
  },

  getDailySales: async (start: string, end: string): Promise<DailySales[]> => {
    const orders = await ordersInRange(start, end)
    const byDate = new Map<string, { total: number; orderCount: number }>()
    for (const o of orders) {
      const entry = byDate.get(o.date) ?? { total: 0, orderCount: 0 }
      entry.total += o.totalAmount
      entry.orderCount += 1
      byDate.set(o.date, entry)
    }
    return Array.from(byDate.entries()).map(([date, v]) => ({ date, total: v.total, orderCount: v.orderCount }))
  },

  getRepMonthlyStats: async (storeId: number, year: number, month: number): Promise<RepMonthlyStats[]> => {
    const { start, end } = monthDateRange(year, month)
    const [reps, orders, snapshotRes] = await Promise.all([
      fetchSalesRepOptions(),
      ordersInRange(start, end),
      supabase.from('staff_monthly_target_snapshots').select('*').eq('store_id', storeId).eq('year', year).eq('month', month),
    ])
    if (snapshotRes.error) throw snapshotRes.error
    const snapshotsByRep = new Map(((snapshotRes.data ?? []) as SnapshotRow[]).map((s) => [s.rep_option_id, s]))
    const actualsByRep = actualSalesByRep(orders)

    return reps.map((rep) => {
      const snapshot = snapshotsByRep.get(rep.id)
      const actual = actualsByRep.get(rep.name) ?? { revenue: 0, guardsmanCount: 0 }
      const individualTarget = snapshot ? Number(snapshot.individual_target) : null
      const tiers = snapshot
        ? { target: individualTarget as number, tier25: Number(snapshot.tier_25), tier50: Number(snapshot.tier_50), tier75: Number(snapshot.tier_75) }
        : null
      const reached = tiers ? tierReached(actual.revenue, tiers) : 'none'
      return {
        repOptionId: rep.id,
        repName: rep.name,
        year,
        month,
        actualSales: actual.revenue,
        individualTarget,
        tier25: tiers?.tier25 ?? null,
        tier50: tiers?.tier50 ?? null,
        tier75: tiers?.tier75 ?? null,
        tierReached: reached,
        monthlyCommission: individualTarget != null ? computeMonthlyCommission(actual.revenue, individualTarget) : 0,
        guardsmanCount: actual.guardsmanCount,
        guardsmanCommission: computeGuardsmanCommission(actual.guardsmanCount),
      }
    })
  },

  getRepQuarterlyBonus: async (storeId: number, fyStartYear: number, quarter: 1 | 2 | 3 | 4): Promise<RepQuarterlyBonus[]> => {
    const months = monthsOfQuarter(fyStartYear, quarter)
    const monthlyStats = await Promise.all(months.map((m) => api.getRepMonthlyStats(storeId, m.year, m.month)))

    const byRep = new Map<number, { repName: string; actualSales: number; targetSum: number; hasTarget: boolean }>()
    for (const monthStats of monthlyStats) {
      for (const s of monthStats) {
        const entry = byRep.get(s.repOptionId) ?? { repName: s.repName, actualSales: 0, targetSum: 0, hasTarget: false }
        entry.actualSales += s.actualSales
        if (s.individualTarget != null) {
          entry.targetSum += s.individualTarget
          entry.hasTarget = true
        }
        byRep.set(s.repOptionId, entry)
      }
    }

    return Array.from(byRep.entries()).map(([repOptionId, e]) => {
      const bonus = computeQuarterlyBonus(e.actualSales, e.hasTarget ? e.targetSum : 0)
      return {
        repOptionId,
        repName: e.repName,
        fyStartYear,
        quarter,
        actualSales: e.actualSales,
        cumulativeTarget: e.hasTarget ? e.targetSum : null,
        tierReached: bonus.tierReached,
        bonusRate: bonus.bonusRate,
        bonusAmount: bonus.bonusAmount,
      }
    })
  },
}