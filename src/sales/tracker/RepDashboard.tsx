import { useEffect, useState } from 'react'
import { api } from '../api'
import type { RepRangeStats, TierReached } from '../types'
import { computeQuarterlyBonus } from './commission'
import { MONTH_NAMES, daysInMonth, fyStartYearForDate, monthsOfQuarter, quarterOfMonth } from './financialYear'

const TIER_LABELS: Record<TierReached, string> = {
  none: 'Below target',
  target: 'Target',
  tier25: '+25%',
  tier50: '+50%',
  tier75: '+75%',
}

export function RepDashboard({ initialStaff }: { initialStaff?: string }) {
  const now = new Date()
  const [reps, setReps] = useState<string[]>([])
  const [staff, setStaff] = useState<string | null>(initialStaff ?? null)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [monthly, setMonthly] = useState<RepRangeStats | null>(null)
  const [quarterly, setQuarterly] = useState<{
    quarter: number
    fyStartYear: number
    actual: number
    target: number | null
    tierReached: TierReached
    bonusRate: number
    bonusAmount: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialStaff) setStaff(initialStaff)
  }, [initialStaff])

  useEffect(() => {
    api
      .getDefaultStore()
      .then((store) => api.getKnownStaff(store.id))
      .then((names) => {
        setReps(names)
        if (!staff && names.length > 0) setStaff(names[0])
      })
      .catch((e) => setError(e.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!staff) return
    let cancelled = false
    api
      .getDefaultStore()
      .then(async (store) => {
        const monthDates = daysInMonth(year, month)
        const monthStats = await api.getRepStatsForRange(store.id, monthDates[0], monthDates[monthDates.length - 1])
        if (cancelled) return
        setMonthly(monthStats.find((s) => s.staff === staff) ?? null)

        const fyStartYear = fyStartYearForDate(new Date(year, month - 1, 1))
        const quarter = quarterOfMonth(fyStartYear, year, month)
        const qMonths = monthsOfQuarter(fyStartYear, quarter)
        const qStart = daysInMonth(qMonths[0].year, qMonths[0].month)[0]
        const qEndDates = daysInMonth(qMonths[2].year, qMonths[2].month)
        const qEnd = qEndDates[qEndDates.length - 1]
        const quarterStats = await api.getRepStatsForRange(store.id, qStart, qEnd)
        if (cancelled) return
        const repQuarter = quarterStats.find((s) => s.staff === staff)
        const bonus = computeQuarterlyBonus(repQuarter?.actual ?? 0, repQuarter?.target ?? 0)
        setQuarterly({
          quarter,
          fyStartYear,
          actual: repQuarter?.actual ?? 0,
          target: repQuarter?.target ?? null,
          tierReached: bonus.tierReached,
          bonusRate: bonus.bonusRate,
          bonusAmount: bonus.bonusAmount,
        })
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [staff, year, month])

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const commissionLabel = isCurrentMonth ? 'Commission pending' : 'Commission earned'

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Rep dashboard</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select value={staff ?? ''} onChange={(e) => setStaff(e.target.value)} style={{ width: 'auto' }}>
            {reps.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ width: 'auto' }}>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 'auto' }}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {monthly && (
        <>
          <div className="stat-row" style={{ marginTop: '1.25rem' }}>
            <div className="stat">
              <div className="label">Actual sales</div>
              <div className="value">${monthly.actual.toFixed(2)}</div>
            </div>
            <div className="stat">
              <div className="label">Individual target</div>
              <div className="value">{monthly.target != null ? `$${monthly.target.toFixed(2)}` : '—'}</div>
            </div>
            <div className="stat">
              <div className="label">Tier reached</div>
              <div className="value">{TIER_LABELS[monthly.tierReached]}</div>
            </div>
            <div className="stat">
              <div className="label">{commissionLabel}</div>
              <div className="value">${monthly.commissionEarned.toFixed(2)}</div>
            </div>
            <div className="stat">
              <div className="label">Guardsman</div>
              <div className="value">
                Sofa {monthly.guardsmanUphCount} / Dining {monthly.guardsmanDtCount} (${monthly.guardsmanCommission.toFixed(2)})
              </div>
            </div>
          </div>

          {monthly.target == null && (
            <p className="error-text" style={{ marginTop: '1rem' }}>
              No target set for this rep this month — enter shifts and a store target in Targets & Shifts admin.
            </p>
          )}
        </>
      )}

      {quarterly && (
        <div className="card" style={{ marginTop: '1.5rem', background: 'var(--surface-2)' }}>
          <h2 style={{ margin: 0 }}>
            Quarterly bonus — Q{quarterly.quarter} FY{quarterly.fyStartYear}-{String(quarterly.fyStartYear + 1).slice(-2)}
          </h2>
          <div className="stat-row" style={{ marginTop: '1rem' }}>
            <div className="stat">
              <div className="label">Cumulative sales</div>
              <div className="value">${quarterly.actual.toFixed(2)}</div>
            </div>
            <div className="stat">
              <div className="label">Highest tier</div>
              <div className="value">{TIER_LABELS[quarterly.tierReached]}</div>
            </div>
            <div className="stat">
              <div className="label">Bonus rate</div>
              <div className="value">{(quarterly.bonusRate * 100).toFixed(1)}%</div>
            </div>
            <div className="stat">
              <div className="label">Bonus amount</div>
              <div className="value">${quarterly.bonusAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
