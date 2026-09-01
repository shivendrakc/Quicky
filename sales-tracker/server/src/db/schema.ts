import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['select', 'yes_no_na'] }).notNull(),
  position: integer('position').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  dependsOnCategoryId: integer('depends_on_category_id'),
  dependsOnValue: text('depends_on_value'),
})

export const categoryOptions = sqliteTable('category_options', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  value: text('value').notNull(),
  position: integer('position').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
})

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  orderNumber: text('order_number').notNull(),
  deliveryDate: text('delivery_date'),
  totalAmount: real('total_amount').notNull().default(0),
  amountPaid: real('amount_paid').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
})

export const orderValues = sqliteTable('order_values', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  optionId: integer('option_id').references(() => categoryOptions.id),
  valueText: text('value_text'),
})
