import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Order } from '../types'
import { LogSaleForm } from './LogSaleForm'

export function EntryView() {
  const [storeId, setStoreId] = useState<number | null>(null)
  const [knownStaff, setKnownStaff] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Order | null>(null)

  useEffect(() => {
    api
      .getDefaultStore()
      .then((store) => {
        setStoreId(store.id)
        return api.getKnownStaff(store.id)
      })
      .then(setKnownStaff)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="error-text">{error}</p>
  if (storeId == null) return <p>Loading…</p>

  return (
    <div>
      {lastSaved && (
        <div className="card" style={{ borderColor: 'var(--green)' }}>
          Saved order <strong>{lastSaved.orderNo}</strong> for {lastSaved.consultant} — ${lastSaved.total.toFixed(2)}
        </div>
      )}
      <LogSaleForm
        storeId={storeId}
        knownStaff={knownStaff}
        onSaved={(order) => {
          setLastSaved(order)
          if (!knownStaff.includes(order.consultant)) setKnownStaff((prev) => [...prev, order.consultant].sort())
        }}
      />
    </div>
  )
}
