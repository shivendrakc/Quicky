import { useEffect, useState } from 'react'
import { api } from '../api'
import type { RepMonthlyStats, RepQuarterlyBonus } from '../types'
import { MONTH_NAMES, fyStartYearForDate, quarterOfMonth } from './financialYear'

const TIER_LABELS: Record<RepMonthlyStats['tierReached'], string> = {
  none: 'Below target',
  target: 'Target',
  tier25: '+25%',
  tier50: '+50%',
  tier75: '+75%',
}

export function RepDashboard() {
  const now = new Date()
  const [reps, setReps] = useState<{ id: number; name: string }[]>([])
  const [repId, setRepId] = useState<number | null>(null)
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [stats, setStats] = useState<RepMonthlyStats | null>(null)
  const [quarterly, setQuarterly] = useState<RepQuarterlyBonus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getSalesReps().then((r) => {
      setReps(r)
      if (r.length > 0) setRepId(r[0].id)
    })
  }, [])

  useEffect(() => {
    if (repId == null) return
    let store: { id: number }
    api
      .getDefaultStore()
      .then((s) => {
        store = s
        return api.getRepMonthlyStats(s.id, year, month)
      })
      .then((all) => {
        setStats(all.find((s) => s.repOptionId === repId) ?? null)
        const fyStartYear = fyStartYearForDate(new Date(year, month - 1, 1))
        const quarter = quarterOfMonth(fyStartYear, year, month)
        return api.getRepQuarterlyBonus(store.id, fyStartYear, quarter)
      })
      .then((all) => setQuarterly(all.find((q) => q.repOptionId === repId) ?? null))
      .catch((e) => setError(e.message))
  }, [repId, year, month])

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Rep dashboard</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select value={repId ?? ''} onChange={(e) => setRepId(Number(e.target.value))} style={{ width: 'auto' }}>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
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

      {stats && (
        <>
          <div className="stat-row" style={{ marginTop: '1.25rem' }}>
            <div className="stat">
              <div className="label">Actual sales</div>
              <div className="value">${stats.actualSales.toFixed(2)}</div>
            </div>
            <div className="stat">
              <div className="label">Individual target</div>
              <div className="value">{stats.individualTarget != null ? `$${stats.individualTarget.toFixed(2)}` : '—'}</div>
            </div>
            <div className="stat">
              <div className="label">Tier reached</div>
              <div className="value">{TIER_LABELS[stats.tierReached]}</div>
            </div>
            <div className="stat">
              <div className="label">Monthly commission</div>
              <div className="value">${stats.monthlyCommission.toFixed(2)}</div>
            </div>
            <div className="stat">
              <div className="label">Guardsman</div>
              <div className="value">
                {stats.guardsmanCount} (${stats.guardsmanCommission.toFixed(2)})
              </div>
            </div>
          </div>

          {stats.individualTarget != null && (
            <div style={{ marginTop: '1.25rem' }}>
              <label>Progress toward next tier</label>
              <TierBar stats={stats} />
            </div>
          )}
        </>
      )}

      {!stats?.individualTarget && stats && (
        <p className="error-text" style={{ marginTop: '1rem' }}>
          No target set for this rep this month — enter shifts and a store target in Admin settings.
        </p>
      )}

      {quarterly && (
        <div className="card" style={{ marginTop: '1.5rem', background: 'var(--surface-2)' }}>
          <h2 style={{ margin: 0 }}>
            Quarterly bonus — Q{quarterly.quarter} FY{quarterly.fyStartYear}-{String(quarterly.fyStartYear + 1).slice(-2)}
          </h2>
          <div className="stat-row" style={{ marginTop: '1rem' }}>
            <div className="stat">
              <div className="label">Cumulative sales</div>
              <div className="value">${quarterly.actualSales.toFixed(2)}</div>
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

function TierBar({ stats }: { stats: RepMonthlyStats }) {
  const target = stats.individualTarget ?? 0
  const max = stats.tier75 ?? target * 1.75
  const pct = max > 0 ? Math.min(100, (stats.actualSales / max) * 100) : 0
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '0.6rem', height: '1.5rem', position: 'relative' }}>
      <div style={{ background: 'var(--accent)', height: '100%', borderRadius: '0.6rem', width: `${pct}%` }} />
    </div>
  )
}
