import { Router } from 'express'
import { loadEnrichedOrders } from '../db/helpers.js'

export const leaderboardRouter = Router()

type Period = 'today' | 'week' | 'month' | 'all'

function periodStart(period: Period): string | null {
  const now = new Date()
  if (period === 'all') return null
  if (period === 'today') {
    return now.toISOString().slice(0, 10)
  }
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d.toISOString().slice(0, 10)
  }
  // month
  const d = new Date(now)
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

leaderboardRouter.get('/', (req, res) => {
  const period = (req.query.period as Period) ?? 'month'
  const start = periodStart(period)

  const orders = loadEnrichedOrders().filter((o) => !start || o.date >= start)

  const byRep = new Map<
    string,
    { rep: string; revenue: number; orderCount: number; guardsmanYes: number; upholsteryYes: number }
  >()

  for (const order of orders) {
    const rep = order.valueByCategory['Sales Rep'] || 'Unassigned'
    const entry = byRep.get(rep) ?? {
      rep,
      revenue: 0,
      orderCount: 0,
      guardsmanYes: 0,
      upholsteryYes: 0,
    }
    entry.revenue += order.totalAmount
    entry.orderCount += 1
    if (order.valueByCategory['Guardsman Insurance Sold'] === 'yes') entry.guardsmanYes += 1
    if (order.valueByCategory['Upholstery'] === 'yes') entry.upholsteryYes += 1
    byRep.set(rep, entry)
  }

  const result = Array.from(byRep.values())
    .map((e) => ({
      rep: e.rep,
      revenue: e.revenue,
      orderCount: e.orderCount,
      guardsmanAttachRate: e.orderCount ? e.guardsmanYes / e.orderCount : 0,
      upholsteryAttachRate: e.orderCount ? e.upholsteryYes / e.orderCount : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  res.json({ period, results: result })
})
