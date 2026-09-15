import { useEffect, useState } from 'react'
import { api } from '../api'
import type { CategoryBreakdown, StorePeriodStats } from '../types'
import { MONTH_NAMES, type Quarter, daysInMonth, fyDateRange, fyLabel, monthsOfQuarter, weeksOfMonth } from './financialYear'
import type { Level } from './drillDownLevel'

type Child = { label: string; start: string; end: string; onClick: () => void }

function levelRange(fyStartYear: number, level: Level): { start: string; end: string } {
  if (level.kind === 'fy') return fyDateRange(fyStartYear)
  if (level.kind === 'quarter') {
    const months = monthsOfQuarter(fyStartYear, level.quarter)
    const first = daysInMonth(months[0].year, months[0].month)
    const last = daysInMonth(months[2].year, months[2].month)
    return { start: first[0], end: last[last.length - 1] }
  }
  if (level.kind === 'month') {
    const days = daysInMonth(level.year, level.month)
    return { start: days[0], end: days[days.length - 1] }
  }
  if (level.kind === 'week') {
    const week = weeksOfMonth(level.year, level.month)[level.weekIndex]
    return { start: week.days[0], end: week.days[week.days.length - 1] }
  }
  return { start: level.date, end: level.date }
}

function breadcrumbLabels(fyStartYear: number, level: Level): string[] {
  const labels = [fyLabel(fyStartYear)]
  if (level.kind !== 'fy') labels.push(`Q${level.quarter}`)
  if (level.kind === 'month' || level.kind === 'week' || level.kind === 'day') labels.push(`${MONTH_NAMES[level.month - 1]} ${level.year}`)
  if (level.kind === 'week' || level.kind === 'day') labels.push(`Week ${level.weekIndex + 1}`)
  if (level.kind === 'day') labels.push(level.date)
  return labels
}

function performanceClass(stats: StorePeriodStats): string {
  if (stats.pctToTarget == null) return stats.actual > 0 ? 'perf-over' : 'perf-none'
  if (stats.pctToTarget < 0.85) return 'perf-under'
  if (stats.pctToTarget > 1.15) return 'perf-over'
  return 'perf-near'
}

export function DrillDownView({
  fyStartYear,
  level,
  onLevelChange,
  onRangeChange,
}: {
  fyStartYear: number
  level: Level
  onLevelChange: (level: Level) => void
  onRangeChange?: (range: { start: string; end: string; label: string }) => void
}) {
  const setLevel = onLevelChange
  const [summary, setSummary] = useState<StorePeriodStats | null>(null)
  const [children, setChildren] = useState<(Child & { stats: StorePeriodStats })[]>([])
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const range = levelRange(fyStartYear, level)
    onRangeChange?.({ ...range, label: breadcrumbLabels(fyStartYear, level).join(' / ') })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, fyStartYear])

  useEffect(() => {
    let cancelled = false
    const range = levelRange(fyStartYear, level)

    const childDefs: Child[] =
      level.kind === 'fy'
        ? ([1, 2, 3, 4] as Quarter[]).map((q) => {
            const r = levelRange(fyStartYear, { kind: 'quarter', quarter: q })
            return { label: `Q${q}`, ...r, onClick: () => setLevel({ kind: 'quarter', quarter: q }) }
          })
        : level.kind === 'quarter'
        ? monthsOfQuarter(fyStartYear, level.quarter).map((m) => {
            const r = levelRange(fyStartYear, { kind: 'month', quarter: level.quarter, year: m.year, month: m.month })
            return {
              label: `${MONTH_NAMES[m.month - 1]} ${m.year}`,
              ...r,
              onClick: () => setLevel({ kind: 'month', quarter: level.quarter, year: m.year, month: m.month }),
            }
          })
        : level.kind === 'month'
        ? weeksOfMonth(level.year, level.month).map((w, i) => {
            const r = { start: w.days[0], end: w.days[w.days.length - 1] }
            return {
              label: w.label,
              ...r,
              onClick: () => setLevel({ kind: 'week', quarter: level.quarter, year: level.year, month: level.month, weekIndex: i }),
            }
          })
        : level.kind === 'week'
        ? (weeksOfMonth(level.year, level.month)[level.weekIndex]?.days ?? []).map((date) => ({
            label: date.slice(-2),
            start: date,
            end: date,
            onClick: () =>
              setLevel({ kind: 'day', quarter: level.quarter, year: level.year, month: level.month, weekIndex: level.weekIndex, date }),
          }))
        : []

    api
      .getDefaultStore()
      .then(async (store) => {
        const [summaryStats, childStats] = await Promise.all([
          api.getStoreStatsForRange(store.id, range.start, range.end),
          Promise.all(childDefs.map((c) => api.getStoreStatsForRange(store.id, c.start, c.end))),
        ])
        if (cancelled) return
        setSummary(summaryStats)
        setChildren(childDefs.map((c, i) => ({ ...c, stats: childStats[i] })))

        if (level.kind === 'day') {
          const b = await api.getCategoryBreakdownForRange(level.date, level.date)
          if (!cancelled) setBreakdown(b)
        } else {
          setBreakdown(null)
        }
      })
      .catch((e) => !cancelled && setError(e.message))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, fyStartYear])

  const breadcrumbs: { label: string; onClick: () => void; current?: boolean }[] = [
    { label: fyLabel(fyStartYear), onClick: () => setLevel({ kind: 'fy' }) },
  ]
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
    breadcrumbs.push({ label: level.date, onClick: () => {}, current: true })
  }

  const maxBar = Math.max(1, ...children.map((c) => Math.max(c.stats.actual, c.stats.target ?? 0)))

  return (
    <div className="card">
      <h2 style={{ margin: 0 }}>Drill-down</h2>
      {error && <p className="error-text">{error}</p>}

      <div className="breadcrumb">
        {breadcrumbs.map((b, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {i > 0 && <span className="breadcrumb-sep">/</span>}
            {b.current ? <strong>{b.label}</strong> : <button className="btn-secondary" onClick={b.onClick}>{b.label}</button>}
          </span>
        ))}
      </div>

      {summary && (
        <div className="stat-row">
          <div className="stat">
            <div className="label">Actual</div>
            <div className="value">${summary.actual.toFixed(2)}</div>
          </div>
          <div className="stat">
            <div className="label">Target</div>
            <div className="value">{summary.target != null ? `$${summary.target.toFixed(2)}` : '—'}</div>
          </div>
          <div className="stat">
            <div className="label">% Achieved</div>
            <div className="value">{summary.pctToTarget != null ? `${(summary.pctToTarget * 100).toFixed(0)}%` : '—'}</div>
          </div>
        </div>
      )}

      {level.kind !== 'day' && children.length > 0 && (
        <div className="bar-chart">
          {children.map((c) => {
            const barHeightPct = (c.stats.actual / maxBar) * 100
            const targetHeightPct = c.stats.target != null ? (c.stats.target / maxBar) * 100 : null
            return (
              <div key={c.label} className="bar-chart-col" onClick={c.onClick}>
                {targetHeightPct != null && (
                  <div className="bar-chart-target-line" style={{ bottom: `${targetHeightPct}%` }} title={`Target: $${c.stats.target?.toFixed(2)}`} />
                )}
                <div
                  className={`bar-chart-bar ${performanceClass(c.stats)}`}
                  style={{ height: `${barHeightPct}%` }}
                  title={`Actual: $${c.stats.actual.toFixed(2)}`}
                />
                <div className="bar-chart-label">{c.label}</div>
              </div>
            )
          })}
        </div>
      )}

      {level.kind === 'day' && breakdown && (
        <div className="stat-row" style={{ marginTop: '1.5rem' }}>
          <div className="stat">
            <div className="label">Casegoods</div>
            <div className="value">{breakdown.casegoods}</div>
          </div>
          <div className="stat">
            <div className="label">Dining</div>
            <div className="value">{breakdown.dining}</div>
          </div>
          <div className="stat">
            <div className="label">Upholstery</div>
            <div className="value">{breakdown.upholstery}</div>
          </div>
          <div className="stat">
            <div className="label">Guardsman (Sofa)</div>
            <div className="value">{breakdown.guardsmanSofa}</div>
          </div>
          <div className="stat">
            <div className="label">Guardsman (Dining)</div>
            <div className="value">{breakdown.guardsmanDining}</div>
          </div>
        </div>
      )}
    </div>
  )
}
