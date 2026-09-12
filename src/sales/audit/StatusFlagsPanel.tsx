import { useEffect, useState } from 'react'
import { api } from '../api'
import type { StatusFlags } from '../types'

export function StatusFlagsPanel() {
  const [data, setData] = useState<StatusFlags | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getStatusFlags()
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="error-text">{error}</p>
  if (!data) return <p>Loading...</p>

  return (
    <div>
      <div className="stat-row" style={{ marginBottom: '1.5rem' }}>
        <div className="stat">
          <div className="label">Unpaid balances</div>
          <div className="value">{data.unpaidBalances.length}</div>
        </div>
        <div className="stat">
          <div className="label">Unconfirmed deliveries</div>
          <div className="value">{data.unconfirmedDeliveries.length}</div>
        </div>
        <div className="stat">
          <div className="label">Pending interstate actions</div>
          <div className="value">{data.pendingInterstateActions.length}</div>
        </div>
      </div>

      <div className="card">
        <h2>Unpaid balances</h2>
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Rep</th>
              <th>Balance owing</th>
            </tr>
          </thead>
          <tbody>
            {data.unpaidBalances.length === 0 ? (
              <tr>
                <td colSpan={4}>None</td>
              </tr>
            ) : (
              data.unpaidBalances.map((o) => (
                <tr key={o.orderId}>
                  <td>{o.orderNumber}</td>
                  <td>{o.date}</td>
                  <td>{o.rep ?? '—'}</td>
                  <td>${o.balance.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Unconfirmed deliveries</h2>
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Delivery date</th>
              <th>Rep</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.unconfirmedDeliveries.length === 0 ? (
              <tr>
                <td colSpan={5}>None</td>
              </tr>
            ) : (
              data.unconfirmedDeliveries.map((o) => (
                <tr key={o.orderId}>
                  <td>{o.orderNumber}</td>
                  <td>{o.date}</td>
                  <td>{o.deliveryDate ?? '—'}</td>
                  <td>{o.rep ?? '—'}</td>
                  <td>{o.status ?? 'not set'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Pending interstate transfer actions</h2>
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Rep</th>
              <th>Action taken</th>
            </tr>
          </thead>
          <tbody>
            {data.pendingInterstateActions.length === 0 ? (
              <tr>
                <td colSpan={4}>None</td>
              </tr>
            ) : (
              data.pendingInterstateActions.map((o) => (
                <tr key={o.orderId}>
                  <td>{o.orderNumber}</td>
                  <td>{o.date}</td>
                  <td>{o.rep ?? '—'}</td>
                  <td>{o.actionTaken ?? 'not set'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
