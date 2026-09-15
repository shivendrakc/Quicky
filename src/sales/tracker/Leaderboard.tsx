import { useEffect, useState } from 'react'
import { api } from '../api'
import type { RepRangeStats } from '../types'

export function Leaderboard({
  range,
  onSelectRep,
}: {
  range: { start: string; end: string; label: string }
  onSelectRep: (staff: string) => void
}) {
  const [rows, setRows] = useState<RepRangeStats[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .getDefaultStore()
      .then((store) => api.getRepStatsForRange(store.id, range.start, range.end))
      .then((stats) => {
        if (cancelled) return
        // Default sort: % to individual target (fairer across shift-weighted targets),
        // confirmed with Shiv over sorting by raw revenue.
        const sorted = [...stats].sort((a, b) => (b.pctToTarget ?? -1) - (a.pctToTarget ?? -1))
        setRows(sorted)
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [range.start, range.end])

  return (
    <div className="card">
      <h2 style={{ margin: 0 }}>Leaderboard — {range.label}</h2>
      {error && <p className="error-text">{error}</p>}
      {!rows ? (
        <p>Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Rep</th>
              <th>Revenue actual</th>
              <th>Revenue target</th>
              <th>% to target</th>
              <th>UPH</th>
              <th>GD UPH</th>
              <th>GD DT</th>
              <th>Commission</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>No reps found for this period</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.staff} style={{ cursor: 'pointer' }} onClick={() => onSelectRep(r.staff)}>
                  <td>{r.staff}</td>
                  <td>${r.actual.toFixed(2)}</td>
                  <td>{r.target != null ? `$${r.target.toFixed(2)}` : '—'}</td>
                  <td>{r.pctToTarget != null ? `${(r.pctToTarget * 100).toFixed(0)}%` : '—'}</td>
                  <td>{r.upholsteryCount}</td>
                  <td>{r.guardsmanUphCount}</td>
                  <td>{r.guardsmanDtCount}</td>
                  <td>${r.commissionEarned.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
