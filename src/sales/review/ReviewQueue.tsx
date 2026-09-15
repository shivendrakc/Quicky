import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { Order } from '../types'
import { LogSaleForm } from '../entry/LogSaleForm'
import { computeReviewStatus } from './reviewStatus'

const STATUS_LABEL: Record<string, string> = {
  red: 'Attention',
  yellow: '24h+ unchecked',
  none: 'New',
  green: 'Checked',
}

function CategoryTags({ order }: { order: Order }) {
  const tags: string[] = []
  if (order.casegoods) tags.push('Casegoods')
  if (order.dining) tags.push('Dining')
  if (order.upholstery) tags.push('Upholstery')
  if (order.guardsmanCategory !== 'none') tags.push(`Guardsman (${order.guardsmanCategory === 'sofa' ? 'Sofa' : 'Dining'})`)
  return (
    <>
      {tags.map((t) => (
        <span key={t} className="badge badge-na" style={{ marginRight: '0.35rem' }}>
          {t}
        </span>
      ))}
    </>
  )
}

export function ReviewQueue() {
  const [storeId, setStoreId] = useState<number | null>(null)
  const [knownStaff, setKnownStaff] = useState<string[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [checkingId, setCheckingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)

  const load = useCallback(() => {
    setLoading(true)
    api
      .getOrders()
      .then(setOrders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    api
      .getDefaultStore()
      .then((store) => {
        setStoreId(store.id)
        return api.getKnownStaff(store.id)
      })
      .then(setKnownStaff)
      .catch((e) => setError(e.message))
    load()
  }, [load])

  // Yellow status depends on elapsed time, not just data — re-render periodically so a row
  // crossing the 24h mark updates without requiring a manual refresh.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  async function check(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    setCheckingId(id)
    try {
      const updated = await api.checkOrder(id)
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCheckingId(null)
    }
  }

  if (editingOrder && storeId != null) {
    return (
      <LogSaleForm
        storeId={storeId}
        knownStaff={knownStaff}
        initialOrder={editingOrder}
        onCancel={() => setEditingOrder(null)}
        onSaved={(saved) => {
          setOrders((prev) => prev.map((o) => (o.id === saved.id ? saved : o)))
          setEditingOrder(null)
        }}
      />
    )
  }

  return (
    <div className="card">
      <h2 style={{ margin: 0 }}>Review queue</h2>
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Consultant</th>
              <th>Order #</th>
              <th>Total</th>
              <th>Categories</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7}>No sales logged yet</td>
              </tr>
            ) : (
              orders.map((o) => {
                const status = computeReviewStatus(o)
                return (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setEditingOrder(o)}>
                    <td>{o.date}</td>
                    <td>{o.consultant}</td>
                    <td>{o.orderNo}</td>
                    <td>${o.total.toFixed(2)}</td>
                    <td>
                      <CategoryTags order={o} />
                    </td>
                    <td>
                      <span className={`badge status-${status}`}>{STATUS_LABEL[status]}</span>
                    </td>
                    <td>
                      {status !== 'green' && (
                        <button className="btn-secondary" disabled={checkingId === o.id} onClick={(e) => check(o.id, e)}>
                          {checkingId === o.id ? 'Checking…' : 'Check'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
