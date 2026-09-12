import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { DailySales } from '../types'
import {
  MONTH_NAMES,
  type Quarter,
  currentFyStartYear,
  daysInMonth,
  fyDateRange,
  fyLabel,
  monthsOfQuarter,
  weeksOfMonth,
} from './financialYear'

type Level =
  | { kind: 'fy' }
  | { kind: 'quarter'; quarter: Quarter }
  | { kind: 'month'; quarter: Quarter; year: number; month: number }
  | { kind: 'week'; quarter: Quarter; year: number; month: number; weekIndex: number }
  | { kind: 'day'; quarter: Quarter; year: number; month: number; weekIndex: number; date: string }

export function DrillDownView() {
  const fyStartYear = currentFyStartYear()
  const [daily, setDaily] = useState<DailySales[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState<Level>({ kind: 'fy' })

  useEffect(() => {
    const { start, end } = fyDateRange(fyStartYear)
    api
      .getDailySales(start, end)
      .then(setDaily)
      .catch((e) => setError(e.message))
  }, [fyStartYear])

  const byDate = useMemo(() => new Map((daily ?? []).map((d) => [d.date, d])), [daily])

  function sumDates(dates: string[]): number {
    return dates.reduce((sum, d) => sum + (byDate.get(d)?.total ?? 0), 0)
  }

  if (!daily) {
    return (
      <div className="card">
        <h2 style={{ margin: 0 }}>Drill-down</h2>
        {error && <p className="error-text">{error}</p>}
        {!error && <p>Loading…</p>}
      </div>
    )
  }

  const breadcrumbs: { label: string; onClick: () => void }[] = [{ label: fyLabel(fyStartYear), onClick: () => setLevel({ kind: 'fy' }) }]
  if (level.kind !== 'fy') {
    breadcrumbs.push({ label: `Q${level.quarter}`, onClick: () => setLevel({ kind: 'quarter', quarter: level.quarter }) })
  }
  if (level.kind === 'month' || level.kind === 'week' || level.kind === 'day') {
    breadcrumbs.push({
      label: `${MONTH_NAMES[level.month - 1]} ${level.year}`,
      onClick: () => setLevel({ kind: 'month', quarter: level.quarter, year: level.year, month: level.month }),
    })
  }
  if (level.kind === 'week' || level.kind === 'day') {
    breadcrumbs.push({
      label: `Week ${level.weekIndex + 1}`,
      onClick: () => setLevel({ kind: 'week', quarter: level.quarter, year: level.year, month: level.month, weekIndex: level.weekIndex }),
    })
  }
  if (level.kind === 'day') {
    breadcrumbs.push({ label: level.date, onClick: () => {} })
  }

  let rows: { label: string; total: number; onClick?: () => void }[] = []

  if (level.kind === 'fy') {
    rows = ([1, 2, 3, 4] as Quarter[]).map((q) => {
      const months = monthsOfQuarter(fyStartYear, q)
      const dates = months.flatMap((m) => daysInMonth(m.year, m.month))
      return { label: `Q${q}`, total: sumDates(dates), onClick: () => setLevel({ kind: 'quarter', quarter: q }) }
    })
  } else if (level.kind === 'quarter') {
    rows = monthsOfQuarter(fyStartYear, level.quarter).map((m) => ({
      label: `${MONTH_NAMES[m.month - 1]} ${m.year}`,
      total: sumDates(daysInMonth(m.year, m.month)),
      onClick: () => setLevel({ kind: 'month', quarter: level.quarter, year: m.year, month: m.month }),
    }))
  } else if (level.kind === 'month') {
    rows = weeksOfMonth(level.year, level.month).map((w, i) => ({
      label: w.label,
      total: sumDates(w.days),
      onClick: () => setLevel({ kind: 'week', quarter: level.quarter, year: level.year, month: level.month, weekIndex: i }),
    }))
  } else if (level.kind === 'week') {
    const week = weeksOfMonth(level.year, level.month)[level.weekIndex]
    rows = (week?.days ?? []).map((date) => ({
      label: date,
      total: sumDates([date]),
      onClick: () => setLevel({ kind: 'day', quarter: level.quarter, year: level.year, month: level.month, weekIndex: level.weekIndex, date }),
    }))
  } else if (level.kind === 'day') {
    const info = byDate.get(level.date)
    rows = [{ label: 'Orders', total: info?.orderCount ?? 0 }]
  }

  const currentTotal = rows.reduce((sum, r) => sum + r.total, 0)

  return (
    <div className="card">
      <h2 style={{ margin: 0 }}>Drill-down</h2>
      {error && <p className="error-text">{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', margin: '0.75rem 0', flexWrap: 'wrap' }}>
        {breadcrumbs.map((b, i) => (
          <span key={i}>
            {i > 0 && <span style={{ color: 'var(--text-dim)', marginRight: '0.5rem' }}>/</span>}
            <button className="btn-secondary" onClick={b.onClick}>
              {b.label}
            </button>
          </span>
        ))}
      </div>

      {level.kind !== 'day' && (
        <p>
          Total: <strong>${currentTotal.toFixed(2)}</strong>
        </p>
      )}

      <table>
        <thead>
          <tr>
            <th>{level.kind === 'day' ? 'Metric' : 'Period'}</th>
            <th>{level.kind === 'day' ? 'Value' : 'Sales'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ cursor: r.onClick ? 'pointer' : 'default' }} onClick={r.onClick}>
              <td>{r.label}</td>
              <td>{level.kind === 'day' && r.label === 'Orders' ? r.total : `$${r.total.toFixed(2)}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
