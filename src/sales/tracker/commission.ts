export type TierReached = 'none' | 'target' | 'tier25' | 'tier50' | 'tier75'

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

// Flat 1% of total actual monthly sales, once the individual monthly target is cleared.
export function computeMonthlyCommission(actualSales: number, individualTarget: number): number {
  if (individualTarget <= 0) return 0
  return actualSales >= individualTarget ? actualSales * 0.01 : 0
}

// Highest cumulative quarterly tier reached pays an additional bonus rate on top of quarterly
// actual sales. Tiers do not stack — only the highest tier's rate applies. "Target" itself pays
// no additional bonus (it only unlocks monthly commission); +25/+50/+75 pay 0.5%/1%/1.5%.
// ASSUMPTION (not spelled out in the design brief): the bonus is a percentage of the rep's total
// actual sales for the quarter, mirroring how the monthly commission is a percentage of monthly
// sales. Flag if the intent was instead a percentage of the quarterly target amount.
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

// Flat $10 per Guardsman policy. v1 assumes at most one policy per order (per order yes/no flag
// already captured by the Logger) — confirmed acceptable for now, multi-policy orders are v2.
export function computeGuardsmanCommission(policyCount: number): number {
  return policyCount * 10
}

// Individual target = store target split by weighted shift share.
export function computeIndividualTargets(
  storeTarget: number,
  reps: { repOptionId: number; weekdayShifts: number; weekendShifts: number }[],
  weekdayWeight: number,
  weekendWeight: number
): Map<number, number> {
  const weighted = reps.map((r) => ({
    repOptionId: r.repOptionId,
    weighted: r.weekdayShifts * weekdayWeight + r.weekendShifts * weekendWeight,
  }))
  const totalWeighted = weighted.reduce((sum, r) => sum + r.weighted, 0)
  const result = new Map<number, number>()
  for (const r of weighted) {
    result.set(r.repOptionId, totalWeighted > 0 ? storeTarget * (r.weighted / totalWeighted) : 0)
  }
  return result
}
