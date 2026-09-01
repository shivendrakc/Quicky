import { db } from './client.js'
import { categories, categoryOptions, orders, orderValues } from './schema.js'

export type CategoryMaps = {
  categoriesById: Map<number, typeof categories.$inferSelect>
  optionsById: Map<number, typeof categoryOptions.$inferSelect>
}

export function loadCategoryMaps(): CategoryMaps {
  const allCategories = db.select().from(categories).all()
  const allOptions = db.select().from(categoryOptions).all()
  return {
    categoriesById: new Map(allCategories.map((c) => [c.id, c])),
    optionsById: new Map(allOptions.map((o) => [o.id, o])),
  }
}

export type EnrichedValue = {
  categoryId: number
  categoryName: string
  type: 'select' | 'yes_no_na'
  optionId: number | null
  valueText: string | null
  displayValue: string | null
}

export function enrichValues(
  rawValues: (typeof import('./schema.js').orderValues.$inferSelect)[],
  maps: CategoryMaps
): EnrichedValue[] {
  return rawValues.map((v) => {
    const category = maps.categoriesById.get(v.categoryId)
    const option = v.optionId != null ? maps.optionsById.get(v.optionId) : undefined
    return {
      categoryId: v.categoryId,
      categoryName: category?.name ?? 'Unknown',
      type: (category?.type ?? 'yes_no_na') as 'select' | 'yes_no_na',
      optionId: v.optionId,
      valueText: v.valueText,
      displayValue: option ? option.value : v.valueText,
    }
  })
}

export type EnrichedOrder = typeof orders.$inferSelect & {
  balance: number
  values: EnrichedValue[]
  valueByCategory: Record<string, string | null>
}

export function loadEnrichedOrders(): EnrichedOrder[] {
  const allOrders = db.select().from(orders).all()
  const allValues = db.select().from(orderValues).all()
  const maps = loadCategoryMaps()

  return allOrders.map((o) => {
    const values = enrichValues(
      allValues.filter((v) => v.orderId === o.id),
      maps
    )
    const valueByCategory: Record<string, string | null> = {}
    for (const v of values) valueByCategory[v.categoryName] = v.displayValue

    return {
      ...o,
      balance: o.totalAmount - o.amountPaid,
      values,
      valueByCategory,
    }
  })
}
