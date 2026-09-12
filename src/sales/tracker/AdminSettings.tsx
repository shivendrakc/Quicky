import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ShiftWeightSettings, Store } from '../types'
import { MONTH_NAMES } from './financialYear'

type SubTab = 'targets' | 'shifts' | 'weights'

export function AdminSettings() {
  const [store, setStore] = useState<Store | null>(null)
  const [subTab, setSubTab] = useState<SubTab>('targets')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getDefaultStore().then(setStore).catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="error-text">{error}</p>
  if (!store) return <p>Loading…</p>

  return (
    <div className="card">
      <h2 style={{ margin: 0 }}>Targets & shifts admin — {store.name}</h2>
      <nav className="subnav" style={{ marginTop: '1rem' }}>
        <button className={subTab === 'targets' ? 'active' : ''} onClick={() => setSubTab('targets')}>
          Monthly target
        </button>
        <button className={subTab === 'shifts' ? 'active' : ''} onClick={() => setSubTab('shifts')}>
          Staff shifts
        </button>
        <button className={subTab === 'weights' ? 'active' : ''} onClick={() => setSubTab('weights')}>
          Shift weights
        </button>
      </nav>

      {subTab === 'targets' && <TargetEntry storeId={store.id} />}
      {subTab === 'shifts' && <ShiftEntry storeId={store.id} />}
      {subTab === 'weights' && <WeightSettings storeId={store.id} />}
    </div>
  )
}

function MonthYearPicker({
  year,
  month,
  onYear,
  onMonth,
}: {
  year: number
  month: number
  onYear: (y: number) => void
  onMonth: (m: number) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <select value={month} onChange={(e) => onMonth(Number(e.target.value))} style={{ width: 'auto' }}>
        {MONTH_NAMES.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select value={year} onChange={(e) => onYear(Number(e.target.value))} style={{ width: 'auto' }}>
        {[year - 1, year, year + 1].map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  )
}

function TargetEntry({ storeId }: { storeId: number }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [target, setTarget] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(false)
    api
      .getMonthlyTarget(storeId, year, month)
      .then((t) => setTarget(t ? String(t.agreedTarget) : ''))
      .catch((e) => setError(e.message))
  }, [storeId, year, month])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await api.upsertMonthlyTarget(storeId, year, month, Number(target) || 0)
      setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <MonthYearPicker year={year} month={month} onYear={setYear} onMonth={setMonth} />
      <div style={{ marginTop: '1rem', maxWidth: '260px' }}>
        <label>Agreed store target</label>
        <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      <button className="btn" style={{ marginTop: '1rem' }} disabled={saving} onClick={save}>
        {saving ? 'Saving…' : 'Save target'}
      </button>
      {saved && <p style={{ color: 'var(--green)', marginTop: '0.5rem' }}>Saved — rep tiers recalculated.</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}

function ShiftEntry({ storeId }: { storeId: number }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [reps, setReps] = useState<{ id: number; name: string }[]>([])
  const [values, setValues] = useState<Record<number, { weekday: string; weekend: string }>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.getSalesReps(), api.getStaffShifts(storeId, year, month)])
      .then(([repList, shifts]) => {
        setReps(repList)
        const next: Record<number, { weekday: string; weekend: string }> = {}
        for (const r of repList) {
          const shift = shifts.find((s) => s.repOptionId === r.id)
          next[r.id] = { weekday: String(shift?.weekdayShifts ?? 0), weekend: String(shift?.weekendShifts ?? 0) }
        }
        setValues(next)
      })
      .catch((e) => setError(e.message))
  }, [storeId, year, month])

  async function save(repId: number) {
    setSavingId(repId)
    setError(null)
    try {
      const v = values[repId]
      await api.upsertStaffShift(storeId, repId, year, month, Number(v.weekday) || 0, Number(v.weekend) || 0)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <MonthYearPicker year={year} month={month} onYear={setYear} onMonth={setMonth} />
      {error && <p className="error-text">{error}</p>}
      <table style={{ marginTop: '1rem' }}>
        <thead>
          <tr>
            <th>Rep</th>
            <th>Weekday shifts</th>
            <th>Weekend shifts</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {reps.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>
                <input
                  type="number"
                  value={values[r.id]?.weekday ?? '0'}
                  onChange={(e) => setValues((prev) => ({ ...prev, [r.id]: { ...prev[r.id], weekday: e.target.value } }))}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={values[r.id]?.weekend ?? '0'}
                  onChange={(e) => setValues((prev) => ({ ...prev, [r.id]: { ...prev[r.id], weekend: e.target.value } }))}
                />
              </td>
              <td>
                <button className="btn-secondary" disabled={savingId === r.id} onClick={() => save(r.id)}>
                  {savingId === r.id ? 'Saving…' : 'Save'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WeightSettings({ storeId }: { storeId: number }) {
  const [history, setHistory] = useState<ShiftWeightSettings[]>([])
  const [weekday, setWeekday] = useState('1')
  const [weekend, setWeekend] = useState('1')
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    api.getShiftWeightSettings(storeId).then(setHistory).catch((e) => setError(e.message))
  }

  useEffect(refresh, [storeId])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await api.addShiftWeightSettings(storeId, Number(weekday) || 1, Number(weekend) || 1, effectiveFrom)
      refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        New settings apply from the effective date forward. Past months already calculated keep their frozen weights.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', maxWidth: '600px' }}>
        <div>
          <label>Weekday weight</label>
          <input type="number" value={weekday} onChange={(e) => setWeekday(e.target.value)} />
        </div>
        <div>
          <label>Weekend weight</label>
          <input type="number" value={weekend} onChange={(e) => setWeekend(e.target.value)} />
        </div>
        <div>
          <label>Effective from</label>
          <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
      </div>
      <button className="btn" style={{ marginTop: '1rem' }} disabled={saving} onClick={save}>
        {saving ? 'Saving…' : 'Add setting'}
      </button>
      {error && <p className="error-text">{error}</p>}

      <table style={{ marginTop: '1.5rem' }}>
        <thead>
          <tr>
            <th>Effective from</th>
            <th>Weekday weight</th>
            <th>Weekend weight</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={3}>No weight settings yet — defaults to 1:1 until one is added.</td>
            </tr>
          ) : (
            history.map((h) => (
              <tr key={h.id}>
                <td>{h.effectiveFrom}</td>
                <td>{h.weekdayWeight}</td>
                <td>{h.weekendWeight}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
