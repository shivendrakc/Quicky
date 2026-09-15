import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import type { DailySales } from '../types'
import { computeDailyExpected } from './commission'
import { MONTH_NAMES, currentFyStartYear, daysInMonth, fyDateRange, fyLabel, isWeekend } from './financialYear'

type Mode = 'target' | 'total'

function performanceClass(actual: number, expected: number): string {
  if (expected <= 0) return actual > 0 ? 'perf-over' : 'perf-none'
  const ratio = actual / expected
  if (ratio < 0.85) return 'perf-under'
  if (ratio > 1.15) return 'perf-over'
  return 'perf-near'
}

function intensityClass(total: number, max: number): string {
  if (total <= 0 || max <= 0) return 'heat-0'
  const ratio = total / max
  if (ratio > 0.75) return 'heat-4'
  if (ratio > 0.5) return 'heat-3'
  if (ratio > 0.25) return 'heat-2'
  return 'heat-1'
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function YearlyCalendar({ onSelectDay }: { onSelectDay: (date: string) => void }) {
  const fyStartYear = currentFyStartYear()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [mode, setMode] = useState<Mode>('target')
  const [daily, setDaily] = useState<DailySales[] | null>(null)
  const [weekdayExpected, setWeekdayExpected] = useState(0)
  const [weekendExpected, setWeekendExpected] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .getDefaultStore()
      .then(async (store) => {
        const monthDates = daysInMonth(year, month)
        const [dailySales, target, weights] = await Promise.all([
          api.getDailySales(monthDates[0], monthDates[monthDates.length - 1]),
          api.getMonthlyTarget(store.id, year, month),
          api.getEffectiveShiftWeightSettings(store.id, monthDates[0]),
        ])
        if (cancelled) return
        setDaily(dailySales)
        const { weekdayExpectedPerDay, weekendExpectedPerDay } = computeDailyExpected(
          target?.agreedTarget ?? 0,
          year,
          month,
          weights?.weekdayWeight ?? 1,
          weights?.weekendWeight ?? 2.5
        )
        setWeekdayExpected(weekdayExpectedPerDay)
        setWeekendExpected(weekendExpectedPerDay)
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [year, month])

  const byDate = useMemo(() => new Map((daily ?? []).map((d) => [d.date, d])), [daily])
  const maxDayTotal = useMemo(() => Math.max(0, ...(daily ?? []).map((d) => d.total)), [daily])

  const { start: fyStart, end: fyEnd } = fyDateRange(fyStartYear)
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const canGoPrev = monthStart > fyStart
  const canGoNext = monthStart < fyEnd

  function shiftMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) {
      m = 12
      y -= 1
    } else if (m > 12) {
      m = 1
      y += 1
    }
    setYear(y)
    setMonth(m)
  }

  const monthDates = daysInMonth(year, month)
  const leadingBlanks = (new Date(year, month - 1, 1).getDay() + 6) % 7 // Monday-first

  return (
    <div className="card">
      <div className="month-calendar-nav">
        <h2 style={{ margin: 0 }}>
          {MONTH_NAMES[month - 1]} {year} — {fyLabel(fyStartYear)}
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="yes-no-na-group">
            <button className={mode === 'target' ? 'selected' : ''} onClick={() => setMode('target')}>
              vs Target
            </button>
            <button className={mode === 'total' ? 'selected' : ''} onClick={() => setMode('total')}>
              Total $
            </button>
          </div>
          <button className="btn-secondary" disabled={!canGoPrev} onClick={() => shiftMonth(-1)}>
            ←
          </button>
          <button className="btn-secondary" disabled={!canGoNext} onClick={() => shiftMonth(1)}>
            →
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="month-calendar">
        <div className="month-calendar-grid">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="month-calendar-weekday-label">
              {w}
            </div>
          ))}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`pad-${i}`} className="month-day-cell day-empty" />
          ))}
          {monthDates.map((date) => {
            const info = byDate.get(date)
            const total = info?.total ?? 0
            const expected = isWeekend(date) ? weekendExpected : weekdayExpected
            const cls = mode === 'target' ? performanceClass(total, expected) : intensityClass(total, maxDayTotal)
            return (
              <button key={date} className={`month-day-cell ${cls}`} onClick={() => onSelectDay(date)}>
                <span className="day-number">{Number(date.slice(-2))}</span>
                <span className="day-total">${total.toFixed(0)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
