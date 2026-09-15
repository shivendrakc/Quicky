// Australian financial year: 1 Jul (fyStartYear) – 30 Jun (fyStartYear + 1).
// Confirmed with the shop as the intended FY boundary for the Sales Tracker.

export type Quarter = 1 | 2 | 3 | 4

export function fyStartYearForDate(date: Date): number {
  const y = date.getFullYear()
  const m = date.getMonth() // 0-indexed
  return m >= 6 ? y : y - 1 // Jul (6) onward belongs to the FY starting this calendar year
}

export function currentFyStartYear(): number {
  return fyStartYearForDate(new Date())
}

export function fyLabel(fyStartYear: number): string {
  return `FY${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`
}

export function fyDateRange(fyStartYear: number): { start: string; end: string } {
  return { start: `${fyStartYear}-07-01`, end: `${fyStartYear + 1}-06-30` }
}

// Calendar (year, month) for a given quarter of the FY. Q1 = Jul-Sep, Q2 = Oct-Dec, Q3 = Jan-Mar, Q4 = Apr-Jun.
export function monthsOfQuarter(fyStartYear: number, quarter: Quarter): { year: number; month: number }[] {
  const startMonthIndex = (quarter - 1) * 3 // 0-based offset from July
  const months: { year: number; month: number }[] = []
  for (let i = 0; i < 3; i++) {
    const offset = startMonthIndex + i
    const calendarMonth = ((6 + offset) % 12) + 1 // 1-indexed calendar month, starting from July (7)
    const calendarYear = fyStartYear + (6 + offset >= 12 ? 1 : 0)
    months.push({ year: calendarYear, month: calendarMonth })
  }
  return months
}

export function quarterOfMonth(fyStartYear: number, year: number, month: number): Quarter {
  const monthsSinceFyStart = (year - fyStartYear) * 12 + (month - 7)
  return (Math.floor(monthsSinceFyStart / 3) + 1) as Quarter
}

export function monthDateRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export function daysInMonth(year: number, month: number): string[] {
  const lastDay = new Date(year, month, 0).getDate()
  return Array.from({ length: lastDay }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`)
}

// Monday-start weeks, clipped to the month (first/last week may be partial).
export function weeksOfMonth(year: number, month: number): { label: string; days: string[] }[] {
  const days = daysInMonth(year, month)
  const weeks: { label: string; days: string[] }[] = []
  let current: string[] = []
  for (const day of days) {
    const dow = new Date(day + 'T00:00:00').getDay() // 0=Sun..6=Sat
    if (current.length > 0 && dow === 1) {
      weeks.push({ label: '', days: current })
      current = []
    }
    current.push(day)
  }
  if (current.length > 0) weeks.push({ label: '', days: current })
  return weeks.map((w, i) => ({ ...w, label: `Week ${i + 1}` }))
}

export function isWeekend(dateStr: string): boolean {
  const dow = new Date(dateStr + 'T00:00:00').getDay()
  return dow === 0 || dow === 6
}

// (year, month) pairs touched by an inclusive date range, in order. Used to figure out which
// monthly_targets / staff_monthly_target_snapshots rows a report period needs to draw from.
export function monthsTouchedByRange(start: string, end: string): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = []
  let y = Number(start.slice(0, 4))
  let m = Number(start.slice(5, 7))
  const endY = Number(end.slice(0, 4))
  const endM = Number(end.slice(5, 7))
  while (y < endY || (y === endY && m <= endM)) {
    months.push({ year: y, month: m })
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return months
}

// The subset of a given month's dates that fall within [start, end].
export function datesInMonthWithinRange(year: number, month: number, start: string, end: string): string[] {
  return daysInMonth(year, month).filter((d) => d >= start && d <= end)
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
