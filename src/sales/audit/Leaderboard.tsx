import { useEffect, useState } from 'react'
import { api } from '../api'
import type { LeaderboardResponse, RepMonthlyStats } from '../types'
import { MONTH_NAMES } from '../tracker/financialYear'

const TIER_LABELS: Record<RepMonthlyStats['tierReached'], string> = {
  none: 'Below target',
  target: 'Target',
  tier25: '+25%',
  tier50: '+50%',
  tier75: '+75%',
}

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Last 7 days' },
  { key: 'month', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
] as const

export function Leaderboard() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('month')
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [monthlyStats, setMonthlyStats] = useState<RepMonthlyStats[] | null>(null)
  const [monthlyError, setMonthlyError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getLeaderboard(period)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [period])

  useEffect(() => {
    const now = new Date()
    api
      .getDefaultStore()
      .then((store) => api.getRepMonthlyStats(store.id, now.getFullYear(), now.getMonth() + 1))
      .then(setMonthlyStats)
      .catch((e) => setMonthlyError(e.message))
  }, [])

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Leaderboard</h2>
        <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} style={{ width: 'auto' }}>
          {PERIODS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}

      {data && (
        <table style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Rep</th>
              <th>Revenue</th>
              <th>Orders</th>
              <th>Guardsman attach</th>
              <th>Upholstery attach</th>
            </tr>
          </thead>
          <tbody>
            {data.results.length === 0 ? (
              <tr>
                <td colSpan={5}>No orders in this period</td>
              </tr>
            ) : (
              data.results.map((r) => (
                <tr key={r.rep}>
                  <td>{r.rep}</td>
                  <td>${r.revenue.toFixed(2)}</td>
                  <td>{r.orderCount}</td>
                  <td>{(r.guardsmanAttachRate * 100).toFixed(0)}%</td>
                  <td>{(r.upholsteryAttachRate * 100).toFixed(0)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      <h2 style={{ marginTop: '2rem' }}>Target progress — {MONTH_NAMES[new Date().getMonth()]} {new Date().getFullYear()}</h2>
      {monthlyError && <p className="error-text">{monthlyError}</p>}
      {monthlyStats && (
        <table style={{ marginTop: '1rem' }}>
          <thead>
            <tr>
              <th>Rep</th>
              <th>Actual</th>
              <th>Target</th>
              <th>Tier</th>
              <th>Commission</th>
              <th>Guardsman</th>
            </tr>
          </thead>
          <tbody>
            {monthlyStats.length === 0 ? (
              <tr>
                <td colSpan={6}>No reps configured yet</td>
              </tr>
            ) : (
              monthlyStats.map((s) => (
                <tr key={s.repOptionId}>
                  <td>{s.repName}</td>
                  <td>${s.actualSales.toFixed(2)}</td>
                  <td>{s.individualTarget != null ? `$${s.individualTarget.toFixed(2)}` : '—'}</td>
                  <td>{TIER_LABELS[s.tierReached]}</td>
                  <td>${s.monthlyCommission.toFixed(2)}</td>
                  <td>
                    {s.guardsmanCount} (${s.guardsmanCommission.toFixed(2)})
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
