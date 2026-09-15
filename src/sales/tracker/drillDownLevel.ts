import { type Quarter, fyStartYearForDate, quarterOfMonth, weeksOfMonth } from './financialYear'

export type Level =
  | { kind: 'fy' }
  | { kind: 'quarter'; quarter: Quarter }
  | { kind: 'month'; quarter: Quarter; year: number; month: number }
  | { kind: 'week'; quarter: Quarter; year: number; month: number; weekIndex: number }
  | { kind: 'day'; quarter: Quarter; year: number; month: number; weekIndex: number; date: string }

export function levelForDate(date: string): Level {
  const [y, m] = date.split('-').map(Number)
  const fyStartYear = fyStartYearForDate(new Date(y, m - 1, 1))
  const quarter = quarterOfMonth(fyStartYear, y, m)
  const weekIndex = weeksOfMonth(y, m).findIndex((w) => w.days.includes(date))
  return { kind: 'day', quarter, year: y, month: m, weekIndex: Math.max(0, weekIndex), date }
}
