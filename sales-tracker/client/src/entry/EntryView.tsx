import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import type { Category, Order } from '../types'
import { OrderWizard } from './OrderWizard'

export function EntryView() {
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [editingOrder, setEditingOrder] = useState<Order | 'new' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([api.getCategories(), api.getOrders()])
      .then(([cats, ords]) => {
        setCategories(cats)
        setOrders(ords)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (editingOrder && categories) {
    return (
      <OrderWizard
        categories={categories}
        initialOrder={editingOrder === 'new' ? undefined : editingOrder}
        onSaved={() => {
          setEditingOrder(null)
          load()
        }}
        onCancel={() => setEditingOrder(null)}
      />
    )
  }

  const filtered = orders.filter((o) => {
    if (!search) return true
    const s = search.toLowerCase()
    const repMatch = o.values.find((v) => v.categoryName === 'Sales Rep')?.displayValue?.toLowerCase()
    return (
      o.orderNumber.toLowerCase().includes(s) ||
      o.date.includes(s) ||
      (o.notes ?? '').toLowerCase().includes(s) ||
      (repMatch ?? '').includes(s)
    )
  })

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Log a sale</h2>
          <button className="btn" onClick={() => setEditingOrder('new')} disabled={!categories}>
            + New order
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Find & edit an order</h2>
        {error && <p className="error-text">{error}</p>}
        <input
          type="text"
          placeholder="Search by order #, date, rep, or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: '1rem' }}
        />
        {loading ? (
          <p>Loading...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Rep</th>
                <th>Total</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>No orders found</td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} onClick={() => setEditingOrder(o)} style={{ cursor: 'pointer' }}>
                    <td>{o.orderNumber}</td>
                    <td>{o.date}</td>
                    <td>{o.values.find((v) => v.categoryName === 'Sales Rep')?.displayValue ?? '—'}</td>
                    <td>${o.totalAmount.toFixed(2)}</td>
                    <td>${o.balance.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
