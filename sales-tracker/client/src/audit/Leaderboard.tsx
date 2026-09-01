import { useEffect, useState } from 'react'
import { api } from '../api'
import type { LeaderboardResponse } from '../types'

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

  useEffect(() => {
    api
      .getLeaderboard(period)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [period])

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
    </div>
  )
}
