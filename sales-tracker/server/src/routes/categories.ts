import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { categories, categoryOptions } from '../db/schema.js'

export const categoriesRouter = Router()

categoriesRouter.get('/', (_req, res) => {
  const allCategories = db.select().from(categories).all()
  const allOptions = db.select().from(categoryOptions).all()

  const result = allCategories
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      ...c,
      options: allOptions
        .filter((o) => o.categoryId === c.id)
        .sort((a, b) => a.position - b.position),
    }))

  res.json(result)
})

categoriesRouter.post('/', (req, res) => {
  const { name, type } = req.body as { name?: string; type?: 'select' | 'yes_no_na' }
  if (!name || !type || !['select', 'yes_no_na'].includes(type)) {
    res.status(400).json({ error: 'name and type (select|yes_no_na) are required' })
    return
  }

  const existing = db.select().from(categories).all()
  const nextPosition = existing.reduce((max, c) => Math.max(max, c.position), -1) + 1

  const created = db
    .insert(categories)
    .values({ name, type, position: nextPosition })
    .returning()
    .get()

  res.status(201).json({ ...created, options: [] })
})

categoriesRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id)
  const { name, position, active, dependsOnCategoryId, dependsOnValue } = req.body as {
    name?: string
    position?: number
    active?: boolean
    dependsOnCategoryId?: number | null
    dependsOnValue?: string | null
  }

  const updates: Partial<typeof categories.$inferInsert> = {}
  if (name !== undefined) updates.name = name
  if (position !== undefined) updates.position = position
  if (active !== undefined) updates.active = active
  if (dependsOnCategoryId !== undefined) updates.dependsOnCategoryId = dependsOnCategoryId
  if (dependsOnValue !== undefined) updates.dependsOnValue = dependsOnValue

  const updated = db
    .update(categories)
    .set(updates)
    .where(eq(categories.id, id))
    .returning()
    .get()

  if (!updated) {
    res.status(404).json({ error: 'Category not found' })
    return
  }

  res.json(updated)
})

categoriesRouter.post('/:id/options', (req, res) => {
  const categoryId = Number(req.params.id)
  const { value } = req.body as { value?: string }
  if (!value) {
    res.status(400).json({ error: 'value is required' })
    return
  }

  const existing = db
    .select()
    .from(categoryOptions)
    .where(eq(categoryOptions.categoryId, categoryId))
    .all()
  const nextPosition = existing.reduce((max, o) => Math.max(max, o.position), -1) + 1

  const created = db
    .insert(categoryOptions)
    .values({ categoryId, value, position: nextPosition })
    .returning()
    .get()

  res.status(201).json(created)
})

categoriesRouter.put('/:id/options/:optionId', (req, res) => {
  const optionId = Number(req.params.optionId)
  const { value, active } = req.body as { value?: string; active?: boolean }

  const updates: Partial<typeof categoryOptions.$inferInsert> = {}
  if (value !== undefined) updates.value = value
  if (active !== undefined) updates.active = active

  const updated = db
    .update(categoryOptions)
    .set(updates)
    .where(eq(categoryOptions.id, optionId))
    .returning()
    .get()

  if (!updated) {
    res.status(404).json({ error: 'Option not found' })
    return
  }

  res.json(updated)
})
