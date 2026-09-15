import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ShiftWeightSettings, StaffLoading, Store } from '../types'
import { MONTH_NAMES } from './financialYear'

type SubTab = 'targets' | 'shifts' | 'weights' | 'loading'

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
        <button className={subTab === 'loading' ? 'active' : ''} onClick={() => setSubTab('loading')}>
          Rep loading
        </button>
      </nav>

      {subTab === 'targets' && <TargetEntry storeId={store.id} />}
      {subTab === 'shifts' && <ShiftEntry storeId={store.id} />}
      {subTab === 'weights' && <WeightSettings storeId={store.id} />}
      {subTab === 'loading' && <LoadingSettings storeId={store.id} />}
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
  const [names, setNames] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [values, setValues] = useState<Record<string, { weekday: string; weekend: string; hours: string }>>({})
  const [savingStaff, setSavingStaff] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.getKnownStaff(storeId), api.getStaffShifts(storeId, year, month)])
      .then(([staffList, shifts]) => {
        setNames(staffList)
        const next: Record<string, { weekday: string; weekend: string; hours: string }> = {}
        for (const s of staffList) {
          const shift = shifts.find((sh) => sh.staff === s)
          next[s] = {
            weekday: String(shift?.weekdayShifts ?? 0),
            weekend: String(shift?.weekendShifts ?? 0),
            hours: String(shift?.hoursWorked ?? 0),
          }
        }
        setValues(next)
      })
      .catch((e) => setError(e.message))
  }, [storeId, year, month])

  async function save(staff: string) {
    setSavingStaff(staff)
    setError(null)
    try {
      const v = values[staff]
      await api.upsertStaffShift(storeId, staff, year, month, Number(v.weekday) || 0, Number(v.weekend) || 0, Number(v.hours) || 0)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSavingStaff(null)
    }
  }

  function addStaff() {
    const name = newName.trim()
    if (!name || names.includes(name)) return
    setNames((prev) => [...prev, name])
    setValues((prev) => ({ ...prev, [name]: { weekday: '0', weekend: '0', hours: '0' } }))
    setNewName('')
  }

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <MonthYearPicker year={year} month={month} onYear={setYear} onMonth={setMonth} />
      {error && <p className="error-text">{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', maxWidth: '360px' }}>
        <input type="text" placeholder="New staff name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-secondary" onClick={addStaff}>
          Add
        </button>
      </div>

      <table style={{ marginTop: '1rem' }}>
        <thead>
          <tr>
            <th>Rep</th>
            <th>Weekday shifts</th>
            <th>Weekend shifts</th>
            <th>Hours worked</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {names.map((s) => (
            <tr key={s}>
              <td>{s}</td>
              <td>
                <input
                  type="number"
                  value={values[s]?.weekday ?? '0'}
                  onChange={(e) => setValues((prev) => ({ ...prev, [s]: { ...prev[s], weekday: e.target.value } }))}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={values[s]?.weekend ?? '0'}
                  onChange={(e) => setValues((prev) => ({ ...prev, [s]: { ...prev[s], weekend: e.target.value } }))}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={values[s]?.hours ?? '0'}
                  onChange={(e) => setValues((prev) => ({ ...prev, [s]: { ...prev[s], hours: e.target.value } }))}
                />
              </td>
              <td>
                <button className="btn-secondary" disabled={savingStaff === s} onClick={() => save(s)}>
                  {savingStaff === s ? 'Saving…' : 'Save'}
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
  const [weekend, setWeekend] = useState('2.5')
  const [hurdle, setHurdle] = useState('0.07')
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
      await api.addShiftWeightSettings(storeId, Number(weekday) || 1, Number(weekend) || 2.5, Number(hurdle) || 0, effectiveFrom)
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
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', maxWidth: '700px' }}>
        <div>
          <label>Weekday weight</label>
          <input type="number" value={weekday} onChange={(e) => setWeekday(e.target.value)} />
        </div>
        <div>
          <label>Weekend weight</label>
          <input type="number" value={weekend} onChange={(e) => setWeekend(e.target.value)} />
        </div>
        <div>
          <label>Hurdle %</label>
          <input type="number" step="0.01" value={hurdle} onChange={(e) => setHurdle(e.target.value)} />
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
            <th>Hurdle %</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={4}>No weight settings yet — defaults to weekday 1 / weekend 2.5 / hurdle 7% until one is added.</td>
            </tr>
          ) : (
            history.map((h) => (
              <tr key={h.id}>
                <td>{h.effectiveFrom}</td>
                <td>{h.weekdayWeight}</td>
                <td>{h.weekendWeight}</td>
                <td>{(h.hurdlePct * 100).toFixed(1)}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function LoadingSettings({ storeId }: { storeId: number }) {
  const [names, setNames] = useState<string[]>([])
  const [history, setHistory] = useState<StaffLoading[]>([])
  const [staff, setStaff] = useState('')
  const [loadingPct, setLoadingPct] = useState('0')
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function refresh() {
    api.getStaffLoading(storeId).then(setHistory).catch((e) => setError(e.message))
  }

  useEffect(() => {
    api
      .getKnownStaff(storeId)
      .then((list) => {
        setNames(list)
        if (list.length > 0) setStaff((prev) => prev || list[0])
      })
      .catch((e) => setError(e.message))
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  async function save() {
    if (!staff) return
    setSaving(true)
    setError(null)
    try {
      await api.setStaffLoading(storeId, staff, Number(loadingPct) || 0, effectiveFrom)
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
        Per-rep loading percentage, applied on top of the hurdle when calculating that rep's individual target.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', maxWidth: '700px' }}>
        <div>
          <label>Rep</label>
          <select value={staff} onChange={(e) => setStaff(e.target.value)} style={{ width: 'auto' }}>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Loading %</label>
          <input type="number" step="0.01" value={loadingPct} onChange={(e) => setLoadingPct(e.target.value)} />
        </div>
        <div>
          <label>Effective from</label>
          <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
      </div>
      <button className="btn" style={{ marginTop: '1rem' }} disabled={saving} onClick={save}>
        {saving ? 'Saving…' : 'Save loading'}
      </button>
      {error && <p className="error-text">{error}</p>}

      <table style={{ marginTop: '1.5rem' }}>
        <thead>
          <tr>
            <th>Rep</th>
            <th>Effective from</th>
            <th>Loading %</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={3}>No loading set yet — defaults to 0% until one is added.</td>
            </tr>
          ) : (
            history.map((h) => (
              <tr key={h.id}>
                <td>{h.staff}</td>
                <td>{h.effectiveFrom}</td>
                <td>{(h.loadingPct * 100).toFixed(1)}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
