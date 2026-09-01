import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { Category, Order } from '../types'
import { OrderWizard } from '../entry/OrderWizard'

export function OrderLog() {
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [search, setSearch] = useState('')
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
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

  const handleDelete = async (order: Order) => {
    if (!confirm(`Delete order ${order.orderNumber}?`)) return
    try {
      await api.deleteOrder(order.id)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete order')
    }
  }

  if (editingOrder && categories) {
    return (
      <OrderWizard
        categories={categories}
        initialOrder={editingOrder}
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
    return (
      o.orderNumber.toLowerCase().includes(s) ||
      o.date.includes(s) ||
      (o.notes ?? '').toLowerCase().includes(s) ||
      o.values.some((v) => (v.displayValue ?? '').toLowerCase().includes(s))
    )
  })

  return (
    <div className="card">
      <h2>Full order log</h2>
      {error && <p className="error-text">{error}</p>}
      <input
        type="text"
        placeholder="Search orders..."
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>No orders found</td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id}>
                  <td>{o.orderNumber}</td>
                  <td>{o.date}</td>
                  <td>{o.values.find((v) => v.categoryName === 'Sales Rep')?.displayValue ?? '—'}</td>
                  <td>${o.totalAmount.toFixed(2)}</td>
                  <td>${o.balance.toFixed(2)}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-secondary" onClick={() => setEditingOrder(o)}>
                      Edit
                    </button>
                    <button className="btn-danger" onClick={() => handleDelete(o)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
