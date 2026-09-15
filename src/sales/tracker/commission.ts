import { daysInMonth, isWeekend } from './financialYear'
import type { TierReached } from '../types'

export type Tiers = {
  target: number
  tier25: number
  tier50: number
  tier75: number
}

export function computeTiers(individualTarget: number): Tiers {
  return {
    target: individualTarget,
    tier25: individualTarget * 1.25,
    tier50: individualTarget * 1.5,
    tier75: individualTarget * 1.75,
  }
}

export function tierReached(actualSales: number, tiers: Tiers): TierReached {
  if (tiers.target <= 0) return 'none'
  if (actualSales >= tiers.tier75) return 'tier75'
  if (actualSales >= tiers.tier50) return 'tier50'
  if (actualSales >= tiers.tier25) return 'tier25'
  if (actualSales >= tiers.target) return 'target'
  return 'none'
}

// Flat 1% of actual sales for the period, once the (possibly prorated) target is cleared.
// Used both for the monthly commission rule and, generalized, for any leaderboard/drill-down
// range — the brief only defines this at monthly granularity, so shorter ranges apply the same
// rule against a day-weighted prorated share of the monthly target (see proratedTargetShare).
export function computeRangeCommission(actualSales: number, target: number): number {
  if (target <= 0) return 0
  return actualSales >= target ? actualSales * 0.01 : 0
}

// Highest cumulative quarterly tier reached pays an additional bonus rate on top of quarterly
// actual sales. Tiers do not stack — only the highest tier's rate applies. "Target" itself pays
// no additional bonus (it only unlocks monthly commission); +25/+50/+75 pay 0.5%/1%/1.5%.
const QUARTERLY_BONUS_RATES: Record<TierReached, number> = {
  none: 0,
  target: 0,
  tier25: 0.005,
  tier50: 0.01,
  tier75: 0.015,
}

export function computeQuarterlyBonus(
  quarterlyActualSales: number,
  quarterlyTarget: number
): { tierReached: TierReached; bonusRate: number; bonusAmount: number } {
  const tiers = computeTiers(quarterlyTarget)
  const reached = tierReached(quarterlyActualSales, tiers)
  const bonusRate = QUARTERLY_BONUS_RATES[reached]
  return { tierReached: reached, bonusRate, bonusAmount: quarterlyActualSales * bonusRate }
}

// Flat $10 per Guardsman policy (sofa + dining combined), independent of the sales tiers.
export function computeGuardsmanCommission(policyCount: number): number {
  return policyCount * 10
}

// ── Shift-weighting formula (brief section 10) ──────────────────────────────────────────
//
//   weighted_weekday_units = weekday_days * weekday_weight
//   weighted_weekend_units = weekend_days * weekend_weight
//   weekday_pool = store_budget * weighted_weekday_units / (weighted_weekday_units + weighted_weekend_units)
//   weekend_pool = store_budget * weighted_weekend_units / (weighted_weekday_units + weighted_weekend_units)
//   rate_per_weekday_shift = weekday_pool / total_weekday_shifts_all_staff
//   rate_per_weekend_shift = weekend_pool / total_weekend_shifts_all_staff
//   individual_target = rep_weekday_shifts * rate_per_weekday_shift + rep_weekend_shifts * rate_per_weekend_shift
//   final_individual_target = individual_target * (1 + hurdle_pct) * (1 + rep_loading_pct)

export type RepShiftInput = { staff: string; weekdayShifts: number; weekendShifts: number }

function weekdayWeekendDayCounts(year: number, month: number): { weekdayDays: number; weekendDays: number } {
  const days = daysInMonth(year, month)
  const weekendDays = days.filter(isWeekend).length
  return { weekdayDays: days.length - weekendDays, weekendDays }
}

export function computeStorePools(
  storeTarget: number,
  year: number,
  month: number,
  weekdayWeight: number,
  weekendWeight: number
): { weekdayPool: number; weekendPool: number } {
  const { weekdayDays, weekendDays } = weekdayWeekendDayCounts(year, month)
  const weightedWeekdayUnits = weekdayDays * weekdayWeight
  const weightedWeekendUnits = weekendDays * weekendWeight
  const totalWeightedUnits = weightedWeekdayUnits + weightedWeekendUnits
  if (totalWeightedUnits <= 0) return { weekdayPool: 0, weekendPool: 0 }
  return {
    weekdayPool: (storeTarget * weightedWeekdayUnits) / totalWeightedUnits,
    weekendPool: (storeTarget * weightedWeekendUnits) / totalWeightedUnits,
  }
}

// Base individual target per rep, before hurdle_pct / loading_pct are applied.
export function computeBaseIndividualTargets(
  storeTarget: number,
  year: number,
  month: number,
  reps: RepShiftInput[],
  weekdayWeight: number,
  weekendWeight: number
): Map<string, number> {
  const { weekdayPool, weekendPool } = computeStorePools(storeTarget, year, month, weekdayWeight, weekendWeight)
  const totalWeekdayShifts = reps.reduce((sum, r) => sum + r.weekdayShifts, 0)
  const totalWeekendShifts = reps.reduce((sum, r) => sum + r.weekendShifts, 0)
  const ratePerWeekdayShift = totalWeekdayShifts > 0 ? weekdayPool / totalWeekdayShifts : 0
  const ratePerWeekendShift = totalWeekendShifts > 0 ? weekendPool / totalWeekendShifts : 0

  const result = new Map<string, number>()
  for (const r of reps) {
    result.set(r.staff, r.weekdayShifts * ratePerWeekdayShift + r.weekendShifts * ratePerWeekendShift)
  }
  return result
}

export function applyHurdleAndLoading(baseIndividualTarget: number, hurdlePct: number, loadingPct: number): number {
  return baseIndividualTarget * (1 + hurdlePct) * (1 + loadingPct)
}

// Per-day expected share of the store target, for calendar/day-level "vs target" coloring.
// Same pool math as above, applied at the store level (no per-rep shift split).
export function computeDailyExpected(
  storeTarget: number,
  year: number,
  month: number,
  weekdayWeight: number,
  weekendWeight: number
): { weekdayExpectedPerDay: number; weekendExpectedPerDay: number } {
  const { weekdayDays, weekendDays } = weekdayWeekendDayCounts(year, month)
  const { weekdayPool, weekendPool } = computeStorePools(storeTarget, year, month, weekdayWeight, weekendWeight)
  return {
    weekdayExpectedPerDay: weekdayDays > 0 ? weekdayPool / weekdayDays : 0,
    weekendExpectedPerDay: weekendDays > 0 ? weekendPool / weekendDays : 0,
  }
}

// Prorates a rep's whole-month finalIndividualTarget down to a subset of that month's dates
// (a week or a single day), weighting weekday/weekend days the same way the monthly target
// itself was built. Used by drill-down/leaderboard at Week and Day granularity, where no
// snapshot exists for a sub-month period.
export function proratedTargetShare(
  finalIndividualTarget: number,
  weekdayWeight: number,
  weekendWeight: number,
  year: number,
  month: number,
  rangeDates: string[]
): number {
  const monthDates = daysInMonth(year, month)
  const weightOf = (d: string) => (isWeekend(d) ? weekendWeight : weekdayWeight)
  const totalWeighted = monthDates.reduce((sum, d) => sum + weightOf(d), 0)
  const rangeWeighted = rangeDates.reduce((sum, d) => sum + weightOf(d), 0)
  return totalWeighted > 0 ? finalIndividualTarget * (rangeWeighted / totalWeighted) : 0
}
