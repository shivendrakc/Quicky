import { useState } from 'react'
import { api } from '../api'
import type { DeliveryType, GuardsmanCategory, Order, OrderInput } from '../types'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function emptyInput(): OrderInput {
  return {
    date: todayIso(),
    consultant: '',
    orderNo: '',
    casegoods: false,
    dining: false,
    upholstery: false,
    guardsmanCategory: 'none',
    declineSku: false,
    mto: false,
    delType: 'metro',
    total: 0,
    deposit: 0,
    paymentType: '',
    attentionRequired: false,
    notes: '',
  }
}

function orderToInput(order: Order): OrderInput {
  return {
    date: order.date,
    consultant: order.consultant,
    orderNo: order.orderNo,
    casegoods: order.casegoods,
    dining: order.dining,
    upholstery: order.upholstery,
    guardsmanCategory: order.guardsmanCategory,
    declineSku: order.declineSku,
    mto: order.mto,
    delType: order.delType,
    total: order.total,
    deposit: order.deposit,
    paymentType: order.paymentType ?? '',
    attentionRequired: order.attentionRequired,
    notes: order.notes ?? '',
  }
}

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="yes-no-na-group">
      <button type="button" className={value ? 'selected' : ''} onClick={() => onChange(true)}>
        Yes
      </button>
      <button type="button" className={!value ? 'selected' : ''} onClick={() => onChange(false)}>
        No
      </button>
    </div>
  )
}

function TwoOption<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="yes-no-na-group">
      {options.map((o) => (
        <button key={o.value} type="button" className={value === o.value ? 'selected' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

const PAYMENT_TYPE_SUGGESTIONS = ['Cash', 'EFTPOS', 'Credit Card', 'Finance', 'Bank Transfer']

export function LogSaleForm({
  storeId,
  knownStaff,
  initialOrder,
  onSaved,
  onCancel,
}: {
  storeId: number
  knownStaff: string[]
  initialOrder?: Order
  onSaved: (order: Order) => void
  onCancel?: () => void
}) {
  const [input, setInput] = useState<OrderInput>(initialOrder ? orderToInput(initialOrder) : emptyInput())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof OrderInput>(key: K, value: OrderInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }))
  }

  const showGuardsmanQuestion = input.dining || input.upholstery
  const guardsmanAnswer: 'yes' | 'no' = input.guardsmanCategory !== 'none' ? 'yes' : 'no'

  function setGuardsmanAnswer(answer: 'yes' | 'no') {
    if (answer === 'no') {
      set('guardsmanCategory', 'none')
    } else {
      // Default to whichever of dining/upholstery is ticked; if both, default to upholstery (sofa).
      set('guardsmanCategory', input.upholstery ? 'sofa' : 'dining')
    }
  }

  async function save() {
    if (!input.consultant.trim() || !input.orderNo.trim()) {
      setError('Consultant and order number are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const cleaned: OrderInput = {
        ...input,
        paymentType: input.paymentType?.trim() || null,
        notes: input.notes?.trim() || null,
        guardsmanCategory: showGuardsmanQuestion ? input.guardsmanCategory : 'none',
      }
      const saved = initialOrder ? await api.updateOrder(initialOrder.id, cleaned) : await api.createOrder(storeId, cleaned)
      onSaved(saved)
      if (!initialOrder) setInput(emptyInput())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{initialOrder ? `Edit sale — ${initialOrder.orderNo}` : 'Log a sale'}</h2>
        {onCancel && (
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="log-sale-grid">
        <div>
          <label>Date</label>
          <input type="date" value={input.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label>Consultant</label>
          <input
            type="text"
            list="known-staff"
            value={input.consultant}
            onChange={(e) => set('consultant', e.target.value)}
            placeholder="Consultant name"
          />
          <datalist id="known-staff">
            {knownStaff.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label>Order number</label>
          <input type="text" value={input.orderNo} onChange={(e) => set('orderNo', e.target.value)} />
        </div>

        <div>
          <label>Casegoods</label>
          <YesNo value={input.casegoods} onChange={(v) => set('casegoods', v)} />
        </div>
        <div>
          <label>Dining</label>
          <YesNo value={input.dining} onChange={(v) => set('dining', v)} />
        </div>
        <div>
          <label>Upholstery</label>
          <YesNo value={input.upholstery} onChange={(v) => set('upholstery', v)} />
        </div>

        {showGuardsmanQuestion && (
          <>
            <div>
              <label>Guardsman</label>
              <YesNo value={guardsmanAnswer === 'yes'} onChange={(v) => setGuardsmanAnswer(v ? 'yes' : 'no')} />
            </div>
            {guardsmanAnswer === 'yes' && (
              <div>
                <label>Guardsman on</label>
                <TwoOption<GuardsmanCategory>
                  value={input.guardsmanCategory}
                  options={[
                    { value: 'sofa', label: 'Sofa' },
                    { value: 'dining', label: 'Dining' },
                  ]}
                  onChange={(v) => set('guardsmanCategory', v)}
                />
              </div>
            )}
          </>
        )}

        <div>
          <label>Decline SKU</label>
          <YesNo value={input.declineSku} onChange={(v) => set('declineSku', v)} />
        </div>
        <div>
          <label>MTO</label>
          <YesNo value={input.mto} onChange={(v) => set('mto', v)} />
        </div>
        <div>
          <label>Delivery type</label>
          <TwoOption<DeliveryType>
            value={input.delType}
            options={[
              { value: 'metro', label: 'Metro' },
              { value: 'interstate', label: 'Interstate' },
            ]}
            onChange={(v) => set('delType', v)}
          />
        </div>

        <div>
          <label>Total $</label>
          <input type="number" step="0.01" value={input.total} onChange={(e) => set('total', Number(e.target.value))} />
        </div>
        <div>
          <label>Deposit $</label>
          <input type="number" step="0.01" value={input.deposit} onChange={(e) => set('deposit', Number(e.target.value))} />
        </div>
        <div>
          <label>Payment type</label>
          <input
            type="text"
            list="payment-types"
            value={input.paymentType ?? ''}
            onChange={(e) => set('paymentType', e.target.value)}
          />
          <datalist id="payment-types">
            {PAYMENT_TYPE_SUGGESTIONS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div>
          <label>Attention required</label>
          <YesNo value={input.attentionRequired} onChange={(v) => set('attentionRequired', v)} />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label>Notes</label>
          <textarea rows={3} value={input.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>

      <button className="btn" style={{ marginTop: '1.25rem' }} disabled={saving} onClick={save}>
        {saving ? 'Saving…' : initialOrder ? 'Save changes' : 'Save sale'}
      </button>
    </div>
  )
}
