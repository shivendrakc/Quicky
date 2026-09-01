import { db } from './client.js'
import { categories } from './schema.js'

export function runSeed() {
  const existing = db.select().from(categories).all()
  if (existing.length > 0) return

  const fixed = [
    { name: 'Sales Rep', type: 'select' as const, position: 0 },
    { name: 'Cased Good', type: 'yes_no_na' as const, position: 1 },
    { name: 'Upholstery', type: 'yes_no_na' as const, position: 2 },
    { name: 'Guardsman Insurance Sold', type: 'yes_no_na' as const, position: 3 },
    { name: 'Delivery Confirmed', type: 'yes_no_na' as const, position: 4 },
    { name: 'Interstate Transfer Needed', type: 'yes_no_na' as const, position: 5 },
  ]

  const inserted = fixed.map((c) =>
    db.insert(categories).values(c).returning().get()
  )

  const interstateTransfer = inserted.find((c) => c.name === 'Interstate Transfer Needed')!

  db.insert(categories)
    .values({
      name: 'Action Taken',
      type: 'yes_no_na',
      position: 6,
      dependsOnCategoryId: interstateTransfer.id,
      dependsOnValue: 'yes',
    })
    .run()
}
