import { Router } from 'express'
import { loadEnrichedOrders } from '../db/helpers.js'

export const statusFlagsRouter = Router()

statusFlagsRouter.get('/', (_req, res) => {
  const orders = loadEnrichedOrders()

  const unpaidBalances = orders
    .filter((o) => o.balance > 0)
    .map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      date: o.date,
      balance: o.balance,
      rep: o.valueByCategory['Sales Rep'] ?? null,
    }))

  const unconfirmedDeliveries = orders
    .filter((o) => o.valueByCategory['Delivery Confirmed'] !== 'yes')
    .map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      date: o.date,
      deliveryDate: o.deliveryDate,
      status: o.valueByCategory['Delivery Confirmed'] ?? null,
      rep: o.valueByCategory['Sales Rep'] ?? null,
    }))

  const pendingInterstateActions = orders
    .filter(
      (o) =>
        o.valueByCategory['Interstate Transfer Needed'] === 'yes' &&
        o.valueByCategory['Action Taken'] !== 'yes'
    )
    .map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      date: o.date,
      actionTaken: o.valueByCategory['Action Taken'] ?? null,
      rep: o.valueByCategory['Sales Rep'] ?? null,
    }))

  res.json({ unpaidBalances, unconfirmedDeliveries, pendingInterstateActions })
})
