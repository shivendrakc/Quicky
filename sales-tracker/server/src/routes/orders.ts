import { Router } from 'express'
import { eq, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { orders, orderValues } from '../db/schema.js'
import { loadCategoryMaps, enrichValues, loadEnrichedOrders } from '../db/helpers.js'

export const ordersRouter = Router()

type OrderValueInput = {
  categoryId: number
  optionId?: number | null
  valueText?: string | null
}

type OrderInput = {
  date: string
  orderNumber: string
  deliveryDate?: string | null
  totalAmount: number
  amountPaid: number
  notes?: string | null
  values: OrderValueInput[]
}

function enrichOrder(order: typeof orders.$inferSelect, values: typeof orderValues.$inferSelect[]) {
  const maps = loadCategoryMaps()
  return {
    ...order,
    balance: order.totalAmount - order.amountPaid,
    values: enrichValues(values.filter((v) => v.orderId === order.id), maps),
  }
}

ordersRouter.get('/', (_req, res) => {
  const result = loadEnrichedOrders().sort((a, b) => (a.date < b.date ? 1 : -1))
  res.json(result)
})

ordersRouter.get('/:id', (req, res) => {
  const id = Number(req.params.id)
  const order = db.select().from(orders).where(eq(orders.id, id)).get()
  if (!order) {
    res.status(404).json({ error: 'Order not found' })
    return
  }
  const values = db.select().from(orderValues).where(eq(orderValues.orderId, id)).all()
  res.json(enrichOrder(order, values))
})

ordersRouter.post('/', (req, res) => {
  const body = req.body as OrderInput
  if (!body.date || !body.orderNumber) {
    res.status(400).json({ error: 'date and orderNumber are required' })
    return
  }

  const result = db.transaction((tx) => {
    const created = tx
      .insert(orders)
      .values({
        date: body.date,
        orderNumber: body.orderNumber,
        deliveryDate: body.deliveryDate ?? null,
        totalAmount: body.totalAmount ?? 0,
        amountPaid: body.amountPaid ?? 0,
        notes: body.notes ?? null,
      })
      .returning()
      .get()

    for (const v of body.values ?? []) {
      tx.insert(orderValues)
        .values({
          orderId: created.id,
          categoryId: v.categoryId,
          optionId: v.optionId ?? null,
          valueText: v.valueText ?? null,
        })
        .run()
    }

    return created
  })

  const values = db.select().from(orderValues).where(eq(orderValues.orderId, result.id)).all()
  res.status(201).json(enrichOrder(result, values))
})

ordersRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id)
  const body = req.body as OrderInput

  const result = db.transaction((tx) => {
    const updated = tx
      .update(orders)
      .set({
        date: body.date,
        orderNumber: body.orderNumber,
        deliveryDate: body.deliveryDate ?? null,
        totalAmount: body.totalAmount ?? 0,
        amountPaid: body.amountPaid ?? 0,
        notes: body.notes ?? null,
        updatedAt: sql`(current_timestamp)`,
      })
      .where(eq(orders.id, id))
      .returning()
      .get()

    if (!updated) return null

    tx.delete(orderValues).where(eq(orderValues.orderId, id)).run()
    for (const v of body.values ?? []) {
      tx.insert(orderValues)
        .values({
          orderId: id,
          categoryId: v.categoryId,
          optionId: v.optionId ?? null,
          valueText: v.valueText ?? null,
        })
        .run()
    }

    return updated
  })

  if (!result) {
    res.status(404).json({ error: 'Order not found' })
    return
  }

  const values = db.select().from(orderValues).where(eq(orderValues.orderId, id)).all()
  res.json(enrichOrder(result, values))
})

ordersRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id)

  db.transaction((tx) => {
    tx.delete(orderValues).where(eq(orderValues.orderId, id)).run()
    tx.delete(orders).where(eq(orders.id, id)).run()
  })

  res.status(204).send()
})
