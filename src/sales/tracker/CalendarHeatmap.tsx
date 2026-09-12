import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { DailySales } from '../types'
import { MONTH_NAMES, currentFyStartYear, daysInMonth, fyDateRange, fyLabel } from './financialYear'

function intensityClass(total: number, max: number): string {
  if (total <= 0 || max <= 0) return 'heat-0'
  const ratio = total / max
  if (ratio > 0.75) return 'heat-4'
  if (ratio > 0.5) return 'heat-3'
  if (ratio > 0.25) return 'heat-2'
  return 'heat-1'
}

export function CalendarHeatmap() {
  const fyStartYear = currentFyStartYear()
  const [daily, setDaily] = useState<DailySales[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const { start, end } = fyDateRange(fyStartYear)
    api
      .getDailySales(start, end)
      .then(setDaily)
      .catch((e) => setError(e.message))
  }, [fyStartYear])

  const byDate = useMemo(() => new Map((daily ?? []).map((d) => [d.date, d])), [daily])
  const maxDay = useMemo(() => Math.max(0, ...(daily ?? []).map((d) => d.total)), [daily])

  const monthsInOrder = useMemo(() => {
    const months: { year: number; month: number }[] = []
    for (let i = 0; i < 12; i++) {
      const month = ((6 + i) % 12) + 1
      const year = fyStartYear + (6 + i >= 12 ? 1 : 0)
      months.push({ year, month })
    }
    return months
  }, [fyStartYear])

  const selectedInfo = selected ? byDate.get(selected) : null

  return (
    <div className="card">
      <h2 style={{ margin: 0 }}>Daily sales heatmap — {fyLabel(fyStartYear)}</h2>
      {error && <p className="error-text">{error}</p>}

      {selected && (
        <p style={{ marginTop: '0.75rem' }}>
          <strong>{selected}</strong>: ${(selectedInfo?.total ?? 0).toFixed(2)} across {selectedInfo?.orderCount ?? 0}{' '}
          order{selectedInfo?.orderCount === 1 ? '' : 's'}
        </p>
      )}

      <div className="heatmap-grid">
        {monthsInOrder.map(({ year, month }) => (
          <div key={`${year}-${month}`} className="heatmap-month">
            <div className="heatmap-month-label">
              {MONTH_NAMES[month - 1]} {year}
            </div>
            <div className="heatmap-days">
              {Array.from({ length: (new Date(year, month - 1, 1).getDay() + 6) % 7 }).map((_, i) => (
                <div key={`pad-${i}`} className="heat-cell heat-pad" />
              ))}
              {daysInMonth(year, month).map((date) => {
                const info = byDate.get(date)
                const total = info?.total ?? 0
                return (
                  <button
                    key={date}
                    className={`heat-cell ${intensityClass(total, maxDay)} ${selected === date ? 'heat-selected' : ''}`}
                    title={`${date}: $${total.toFixed(2)}`}
                    onClick={() => setSelected(date)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
