import { supabase } from '../lib/supabase'
import type {
  CategoryBreakdown,
  DailySales,
  DeliveryType,
  GuardsmanCategory,
  MonthlyTarget,
  Order,
  OrderInput,
  RepRangeStats,
  ShiftWeightSettings,
  StaffLoading,
  StaffShift,
  StaffMonthlyTargetSnapshot,
  Store,
  StorePeriodStats,
} from './types'
import { computeTiers, tierReached, computeRangeCommission, computeBaseIndividualTargets, applyHurdleAndLoading, computeDailyExpected, proratedTargetShare } from './tracker/commission'
import { datesInMonthWithinRange, monthsTouchedByRange } from './tracker/financialYear'

// Talks to Supabase directly (no backend server), matching QuickShip's architecture.

type OrderRow = {
  id: number
  store_id: number
  date: string
  consultant: string
  order_no: string
  casegoods: boolean
  dining: boolean
  upholstery: boolean
  guardsman_category: GuardsmanCategory
  decline_sku: boolean
  mto: boolean
  del_type: DeliveryType
  total: number | string
  deposit: number | string
  payment_type: string | null
  attention_required: boolean
  notes: string | null
  logged_at: string
  checked_at: string | null
  updated_at: string
}

type StoreRow = { id: number; name: string }
type MonthlyTargetRow = { id: number; store_id: number; year: number; month: number; agreed_target: number | string }
type ShiftWeightSettingsRow = {
  id: number
  store_id: number
  weekday_weight: number | string
  weekend_weight: number | string
  hurdle_pct: number | string
  effective_from: string
}
type StaffLoadingRow = { id: number; store_id: number; staff: string; loading_pct: number | string; effective_from: string }
type StaffShiftRow = {
  id: number
  store_id: number
  staff: string
  year: number
  month: number
  weekday_shifts: number
  weekend_shifts: number
  hours_worked: number | string
}
type SnapshotRow = {
  id: number
  store_id: number
  staff: string
  year: number
  month: number
  weekday_shifts: number
  weekend_shifts: number
  weekday_weight: number | string
  weekend_weight: number | string
  hurdle_pct: number | string
  loading_pct: number | string
  base_individual_target: number | string
  final_individual_target: number | string
  tier_25: number | string
  tier_50: number | string
  tier_75: number | string
}

function mapOrder(o: OrderRow): Order {
  return {
    id: o.id,
    storeId: o.store_id,
    date: o.date,
    consultant: o.consultant,
    orderNo: o.order_no,
    casegoods: o.casegoods,
    dining: o.dining,
    upholstery: o.upholstery,
    guardsmanCategory: o.guardsman_category,
    declineSku: o.decline_sku,
    mto: o.mto,
    delType: o.del_type,
    total: Number(o.total),
    deposit: Number(o.deposit),
    paymentType: o.payment_type,
    attentionRequired: o.attention_required,
    notes: o.notes,
    loggedAt: o.logged_at,
    checkedAt: o.checked_at,
    updatedAt: o.updated_at,
  }
}

function orderInputToRow(storeId: number, input: OrderInput) {
  return {
    store_id: storeId,
    date: input.date,
    consultant: input.consultant,
    order_no: input.orderNo,
    casegoods: input.casegoods,
    dining: input.dining,
    upholstery: input.upholstery,
    guardsman_category: input.guardsmanCategory,
    decline_sku: input.declineSku,
    mto: input.mto,
    del_type: input.delType,
    total: input.total,
    deposit: input.deposit,
    payment_type: input.paymentType,
    attention_required: input.attentionRequired,
    notes: input.notes,
  }
}

function mapStore(s: StoreRow): Store {
  return { id: s.id, name: s.name }
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
    hurdlePct: Number(s.hurdle_pct),
    effectiveFrom: s.effective_from,
  }
}

function mapStaffLoading(s: StaffLoadingRow): StaffLoading {
  return { id: s.id, storeId: s.store_id, staff: s.staff, loadingPct: Number(s.loading_pct), effectiveFrom: s.effective_from }
}

function mapStaffShift(s: StaffShiftRow): StaffShift {
  return {
    id: s.id,
    storeId: s.store_id,
    staff: s.staff,
    year: s.year,
    month: s.month,
    weekdayShifts: s.weekday_shifts,
    weekendShifts: s.weekend_shifts,
    hoursWorked: Number(s.hours_worked),
  }
}

function mapSnapshot(s: SnapshotRow): StaffMonthlyTargetSnapshot {
  return {
    id: s.id,
    storeId: s.store_id,
    staff: s.staff,
    year: s.year,
    month: s.month,
    weekdayShifts: s.weekday_shifts,
    weekendShifts: s.weekend_shifts,
    weekdayWeight: Number(s.weekday_weight),
    weekendWeight: Number(s.weekend_weight),
    hurdlePct: Number(s.hurdle_pct),
    loadingPct: Number(s.loading_pct),
    baseIndividualTarget: Number(s.base_individual_target),
    finalIndividualTarget: Number(s.final_individual_target),
    tier25: Number(s.tier_25),
    tier50: Number(s.tier_50),
    tier75: Number(s.tier_75),
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

async function getActiveStaffLoading(storeId: number, staff: string, onOrBefore: string): Promise<number> {
  const { data, error } = await supabase
    .from('staff_loading')
    .select('*')
    .eq('store_id', storeId)
    .eq('staff', staff)
    .lte('effective_from', onOrBefore)
    .order('effective_from', { ascending: false })
    .limit(1)
  if (error) throw error
  const row = (data ?? [])[0] as StaffLoadingRow | undefined
  return row ? Number(row.loading_pct) : 0
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

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const weights = await getActiveShiftWeightSettings(storeId, monthStart)
  const weekdayWeight = weights?.weekdayWeight ?? 1
  const weekendWeight = weights?.weekendWeight ?? 2.5
  const hurdlePct = weights?.hurdlePct ?? 0.07

  const baseTargets = computeBaseIndividualTargets(
    Number(target.agreed_target),
    year,
    month,
    shifts.map((s) => ({ staff: s.staff, weekdayShifts: s.weekday_shifts, weekendShifts: s.weekend_shifts })),
    weekdayWeight,
    weekendWeight
  )

  const snapshotRows = await Promise.all(
    shifts.map(async (s) => {
      const baseTarget = baseTargets.get(s.staff) ?? 0
      const loadingPct = await getActiveStaffLoading(storeId, s.staff, monthStart)
      const finalTarget = applyHurdleAndLoading(baseTarget, hurdlePct, loadingPct)
      const tiers = computeTiers(finalTarget)
      return {
        store_id: storeId,
        staff: s.staff,
        year,
        month,
        weekday_shifts: s.weekday_shifts,
        weekend_shifts: s.weekend_shifts,
        weekday_weight: weekdayWeight,
        weekend_weight: weekendWeight,
        hurdle_pct: hurdlePct,
        loading_pct: loadingPct,
        base_individual_target: baseTarget,
        final_individual_target: finalTarget,
        tier_25: tiers.tier25,
        tier_50: tiers.tier50,
        tier_75: tiers.tier75,
        calculated_at: new Date().toISOString(),
      }
    })
  )

  const { error: upsertErr } = await supabase
    .from('staff_monthly_target_snapshots')
    .upsert(snapshotRows, { onConflict: 'store_id,staff,year,month' })
  if (upsertErr) throw upsertErr
}

export const api = {
  getStores: async (): Promise<Store[]> => {
    const { data, error } = await supabase.from('stores').select('*').order('id')
    if (error) throw error
    return ((data ?? []) as StoreRow[]).map(mapStore)
  },

  getDefaultStore: async (): Promise<Store> => {
    const stores = await api.getStores()
    const store = stores[0]
    if (!store) throw new Error('No store configured. Insert a row into the stores table first.')
    return store
  },

  getKnownStaff: async (storeId: number): Promise<string[]> => {
    const [shiftsRes, ordersRes] = await Promise.all([
      supabase.from('staff_shifts').select('staff').eq('store_id', storeId),
      supabase.from('orders').select('consultant').eq('store_id', storeId),
    ])
    if (shiftsRes.error) throw shiftsRes.error
    if (ordersRes.error) throw ordersRes.error
    const names = new Set<string>()
    for (const r of (shiftsRes.data ?? []) as { staff: string }[]) names.add(r.staff)
    for (const r of (ordersRes.data ?? []) as { consultant: string }[]) names.add(r.consultant)
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  },

  getOrders: async (): Promise<Order[]> => {
    const { data, error } = await supabase.from('orders').select('*').order('date', { ascending: false })
    if (error) throw error
    return ((data ?? []) as OrderRow[]).map(mapOrder)
  },

  getOrder: async (id: number): Promise<Order> => {
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).single()
    if (error) throw error
    return mapOrder(data as OrderRow)
  },

  getOrdersInRange: async (start: string, end: string): Promise<Order[]> => {
    const { data, error } = await supabase.from('orders').select('*').gte('date', start).lte('date', end)
    if (error) throw error
    return ((data ?? []) as OrderRow[]).map(mapOrder)
  },

  createOrder: async (storeId: number, input: OrderInput): Promise<Order> => {
    const { data, error } = await supabase.from('orders').insert(orderInputToRow(storeId, input)).select().single()
    if (error) throw error
    return mapOrder(data as OrderRow)
  },

  updateOrder: async (id: number, input: OrderInput): Promise<Order> => {
    const { data: existing, error: exErr } = await supabase.from('orders').select('store_id').eq('id', id).single()
    if (exErr) throw exErr
    const { data, error } = await supabase
      .from('orders')
      .update({ ...orderInputToRow((existing as { store_id: number }).store_id, input), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return mapOrder(data as OrderRow)
  },

  checkOrder: async (id: number): Promise<Order> => {
    const { data, error } = await supabase
      .from('orders')
      .update({ checked_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return mapOrder(data as OrderRow)
  },

  getDailySales: async (start: string, end: string): Promise<DailySales[]> => {
    const orders = await api.getOrdersInRange(start, end)
    const byDate = new Map<string, { total: number; orderCount: number }>()
    for (const o of orders) {
      const entry = byDate.get(o.date) ?? { total: 0, orderCount: 0 }
      entry.total += o.total
      entry.orderCount += 1
      byDate.set(o.date, entry)
    }
    return Array.from(byDate.entries()).map(([date, v]) => ({ date, total: v.total, orderCount: v.orderCount }))
  },

  getCategoryBreakdownForRange: async (start: string, end: string): Promise<CategoryBreakdown> => {
    const orders = await api.getOrdersInRange(start, end)
    return orders.reduce<CategoryBreakdown>(
      (acc, o) => ({
        casegoods: acc.casegoods + (o.casegoods ? 1 : 0),
        dining: acc.dining + (o.dining ? 1 : 0),
        upholstery: acc.upholstery + (o.upholstery ? 1 : 0),
        guardsmanSofa: acc.guardsmanSofa + (o.guardsmanCategory === 'sofa' ? 1 : 0),
        guardsmanDining: acc.guardsmanDining + (o.guardsmanCategory === 'dining' ? 1 : 0),
      }),
      { casegoods: 0, dining: 0, upholstery: 0, guardsmanSofa: 0, guardsmanDining: 0 }
    )
  },

  // Store-level actual vs. target for an arbitrary date range (used by the calendar and the
  // drill-down bars). Target is built day-by-day from each touched month's agreed_target,
  // weighted the same way individual targets are (see computeDailyExpected) — this naturally
  // handles whole months, quarters, the FY, or an arbitrary week/day slice.
  getStoreStatsForRange: async (storeId: number, start: string, end: string): Promise<StorePeriodStats> => {
    const months = monthsTouchedByRange(start, end)
    let target = 0
    let hasAnyTarget = false

    for (const { year, month } of months) {
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
      const [targetRes, weights] = await Promise.all([
        supabase.from('monthly_targets').select('*').eq('store_id', storeId).eq('year', year).eq('month', month).limit(1),
        getActiveShiftWeightSettings(storeId, monthStart),
      ])
      if (targetRes.error) throw targetRes.error
      const targetRow = (targetRes.data ?? [])[0] as MonthlyTargetRow | undefined
      if (!targetRow) continue
      hasAnyTarget = true

      const overlapDates = datesInMonthWithinRange(year, month, start, end)
      const { weekdayExpectedPerDay, weekendExpectedPerDay } = computeDailyExpected(
        Number(targetRow.agreed_target),
        year,
        month,
        weights?.weekdayWeight ?? 1,
        weights?.weekendWeight ?? 2.5
      )
      for (const d of overlapDates) {
        const dow = new Date(d + 'T00:00:00').getDay()
        target += dow === 0 || dow === 6 ? weekendExpectedPerDay : weekdayExpectedPerDay
      }
    }

    const orders = await api.getOrdersInRange(start, end)
    const actual = orders.reduce((sum, o) => sum + o.total, 0)
    const finalTarget = hasAnyTarget ? target : null
    return { actual, target: finalTarget, pctToTarget: finalTarget ? actual / finalTarget : null }
  },

  // Per-rep actual vs. target for an arbitrary date range. Month-level ranges use the snapshot
  // directly; shorter (week/day) ranges prorate it; longer (quarter/FY) ranges sum whole months.
  getRepStatsForRange: async (storeId: number, start: string, end: string): Promise<RepRangeStats[]> => {
    const months = monthsTouchedByRange(start, end)
    const targetByStaff = new Map<string, number>()
    const hasTargetForStaff = new Set<string>()

    for (const { year, month } of months) {
      const { data, error } = await supabase
        .from('staff_monthly_target_snapshots')
        .select('*')
        .eq('store_id', storeId)
        .eq('year', year)
        .eq('month', month)
      if (error) throw error
      const overlapDates = datesInMonthWithinRange(year, month, start, end)
      for (const row of (data ?? []) as SnapshotRow[]) {
        const snapshot = mapSnapshot(row)
        const share = proratedTargetShare(
          snapshot.finalIndividualTarget,
          snapshot.weekdayWeight,
          snapshot.weekendWeight,
          year,
          month,
          overlapDates
        )
        targetByStaff.set(snapshot.staff, (targetByStaff.get(snapshot.staff) ?? 0) + share)
        hasTargetForStaff.add(snapshot.staff)
      }
    }

    const [orders, staffNames] = await Promise.all([api.getOrdersInRange(start, end), api.getKnownStaff(storeId)])
    const byStaff = new Map<
      string,
      { actual: number; upholsteryCount: number; guardsmanUphCount: number; guardsmanDtCount: number }
    >()
    for (const name of staffNames) byStaff.set(name, { actual: 0, upholsteryCount: 0, guardsmanUphCount: 0, guardsmanDtCount: 0 })
    for (const o of orders) {
      const entry = byStaff.get(o.consultant) ?? { actual: 0, upholsteryCount: 0, guardsmanUphCount: 0, guardsmanDtCount: 0 }
      entry.actual += o.total
      if (o.upholstery) entry.upholsteryCount += 1
      if (o.guardsmanCategory === 'sofa') entry.guardsmanUphCount += 1
      if (o.guardsmanCategory === 'dining') entry.guardsmanDtCount += 1
      byStaff.set(o.consultant, entry)
    }

    return Array.from(byStaff.entries()).map(([staff, e]) => {
      const target = hasTargetForStaff.has(staff) ? targetByStaff.get(staff) ?? 0 : null
      const tiers = computeTiers(target ?? 0)
      const guardsmanCommission = (e.guardsmanUphCount + e.guardsmanDtCount) * 10
      return {
        staff,
        actual: e.actual,
        target,
        pctToTarget: target ? e.actual / target : null,
        tierReached: target != null ? tierReached(e.actual, tiers) : 'none',
        commissionEarned: computeRangeCommission(e.actual, target ?? 0),
        upholsteryCount: e.upholsteryCount,
        guardsmanUphCount: e.guardsmanUphCount,
        guardsmanDtCount: e.guardsmanDtCount,
        guardsmanCommission,
      }
    })
  },

  getEffectiveShiftWeightSettings: async (storeId: number, onOrBefore: string): Promise<ShiftWeightSettings | null> => {
    return getActiveShiftWeightSettings(storeId, onOrBefore)
  },

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
    hurdlePct: number,
    effectiveFrom: string
  ): Promise<ShiftWeightSettings> => {
    const { data, error } = await supabase
      .from('shift_weight_settings')
      .insert({
        store_id: storeId,
        weekday_weight: weekdayWeight,
        weekend_weight: weekendWeight,
        hurdle_pct: hurdlePct,
        effective_from: effectiveFrom,
      })
      .select()
      .single()
    if (error) throw error
    return mapShiftWeightSettings(data as ShiftWeightSettingsRow)
  },

  getStaffLoading: async (storeId: number): Promise<StaffLoading[]> => {
    const { data, error } = await supabase
      .from('staff_loading')
      .select('*')
      .eq('store_id', storeId)
      .order('effective_from', { ascending: false })
    if (error) throw error
    return ((data ?? []) as StaffLoadingRow[]).map(mapStaffLoading)
  },

  setStaffLoading: async (storeId: number, staff: string, loadingPct: number, effectiveFrom: string): Promise<StaffLoading> => {
    const { data, error } = await supabase
      .from('staff_loading')
      .upsert(
        { store_id: storeId, staff, loading_pct: loadingPct, effective_from: effectiveFrom },
        { onConflict: 'store_id,staff,effective_from' }
      )
      .select()
      .single()
    if (error) throw error
    return mapStaffLoading(data as StaffLoadingRow)
  },

  getStaffShifts: async (storeId: number, year: number, month: number): Promise<StaffShift[]> => {
    const { data, error } = await supabase
      .from('staff_shifts')
      .select('*')
      .eq('store_id', storeId)
      .eq('year', year)
      .eq('month', month)
    if (error) throw error
    return ((data ?? []) as StaffShiftRow[]).map(mapStaffShift)
  },

  upsertStaffShift: async (
    storeId: number,
    staff: string,
    year: number,
    month: number,
    weekdayShifts: number,
    weekendShifts: number,
    hoursWorked: number
  ): Promise<void> => {
    const { error } = await supabase.from('staff_shifts').upsert(
      {
        store_id: storeId,
        staff,
        year,
        month,
        weekday_shifts: weekdayShifts,
        weekend_shifts: weekendShifts,
        hours_worked: hoursWorked,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id,staff,year,month' }
    )
    if (error) throw error
    await recalcSnapshotsForPeriod(storeId, year, month)
  },
}
