import { useMemo, useState } from 'react'
import { api } from '../api'
import type { Category, Order, OrderValueInput } from '../types'

type FixedFieldKey = 'date' | 'orderNumber' | 'deliveryDate' | 'totalAmount' | 'amountPaid' | 'notes'

type FixedStep = { kind: 'fixed'; key: FixedFieldKey; label: string; required: boolean }
type CategoryStep = { kind: 'category'; category: Category }
type Step = FixedStep | CategoryStep

const FIXED_STEPS: FixedStep[] = [
  { kind: 'fixed', key: 'date', label: 'Sale date', required: true },
  { kind: 'fixed', key: 'orderNumber', label: 'Order number', required: true },
  { kind: 'fixed', key: 'deliveryDate', label: 'Delivery date', required: false },
  { kind: 'fixed', key: 'totalAmount', label: 'Total order amount ($)', required: false },
  { kind: 'fixed', key: 'amountPaid', label: 'Amount paid ($)', required: false },
  { kind: 'fixed', key: 'notes', label: 'Notes', required: false },
]

type CategoryValue = { optionId?: number | null; valueText?: string | null }

type Props = {
  categories: Category[]
  initialOrder?: Order
  onSaved: () => void
  onCancel: () => void
}

export function OrderWizard({ categories, initialOrder, onSaved, onCancel }: Props) {
  const [fixed, setFixed] = useState({
    date: initialOrder?.date ?? new Date().toISOString().slice(0, 10),
    orderNumber: initialOrder?.orderNumber ?? '',
    deliveryDate: initialOrder?.deliveryDate ?? '',
    totalAmount: initialOrder?.totalAmount?.toString() ?? '',
    amountPaid: initialOrder?.amountPaid?.toString() ?? '',
    notes: initialOrder?.notes ?? '',
  })

  const [categoryValues, setCategoryValues] = useState<Record<number, CategoryValue>>(() => {
    const initial: Record<number, CategoryValue> = {}
    for (const v of initialOrder?.values ?? []) {
      initial[v.categoryId] = { optionId: v.optionId, valueText: v.valueText }
    }
    return initial
  })

  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const activeCategories = useMemo(
    () => categories.filter((c) => c.active).sort((a, b) => a.position - b.position),
    [categories]
  )

  const visibleCategorySteps: CategoryStep[] = useMemo(() => {
    return activeCategories
      .filter((c) => {
        if (c.dependsOnCategoryId == null) return true
        const dep = categoryValues[c.dependsOnCategoryId]
        return dep?.valueText === c.dependsOnValue
      })
      .map((c) => ({ kind: 'category', category: c }))
  }, [activeCategories, categoryValues])

  const steps: Step[] = useMemo(() => [...FIXED_STEPS, ...visibleCategorySteps], [visibleCategorySteps])

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  const setCategoryValue = (categoryId: number, value: CategoryValue) => {
    setCategoryValues((prev) => ({ ...prev, [categoryId]: value }))
  }

  const validateStep = (): string | null => {
    if (step.kind === 'fixed' && step.required && !fixed[step.key]) {
      return `${step.label} is required`
    }
    return null
  }

  const goNext = () => {
    const err = validateStep()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }

  const goBack = () => {
    setError(null)
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  const handleSave = async () => {
    const err = validateStep()
    if (err) {
      setError(err)
      return
    }

    const values: OrderValueInput[] = Object.entries(categoryValues)
      .filter(([, v]) => v.optionId != null || v.valueText != null)
      .map(([categoryId, v]) => ({
        categoryId: Number(categoryId),
        optionId: v.optionId ?? null,
        valueText: v.valueText ?? null,
      }))

    const input = {
      date: fixed.date,
      orderNumber: fixed.orderNumber,
      deliveryDate: fixed.deliveryDate || null,
      totalAmount: Number(fixed.totalAmount) || 0,
      amountPaid: Number(fixed.amountPaid) || 0,
      notes: fixed.notes || null,
      values,
    }

    setSaving(true)
    setError(null)
    try {
      if (initialOrder) {
        await api.updateOrder(initialOrder.id, input)
      } else {
        await api.createOrder(input)
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save order')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!initialOrder) return
    if (!confirm(`Delete order ${initialOrder.orderNumber}? This cannot be undone.`)) return
    setSaving(true)
    try {
      await api.deleteOrder(initialOrder.id)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete order')
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>{initialOrder ? `Edit order ${initialOrder.orderNumber}` : 'New order'}</h2>
        <button className="btn-secondary" onClick={onCancel}>
          Close
        </button>
      </div>

      <p className="wizard-progress">
        Step {stepIndex + 1} of {steps.length}
      </p>

      <div style={{ minHeight: '160px' }}>
        {step.kind === 'fixed' ? (
          <FixedFieldInput
            step={step}
            value={fixed[step.key]}
            onChange={(v) => setFixed((prev) => ({ ...prev, [step.key]: v }))}
          />
        ) : (
          <CategoryFieldInput
            category={step.category}
            value={categoryValues[step.category.id]}
            onChange={(v) => setCategoryValue(step.category.id, v)}
          />
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="wizard-actions">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={goBack} disabled={stepIndex === 0}>
            Back
          </button>
          {initialOrder && (
            <button className="btn-danger" onClick={handleDelete} disabled={saving}>
              Delete order
            </button>
          )}
        </div>
        {isLast ? (
          <button className="btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save order'}
          </button>
        ) : (
          <button className="btn" onClick={goNext}>
            Next
          </button>
        )}
      </div>
    </div>
  )
}

function FixedFieldInput({
  step,
  value,
  onChange,
}: {
  step: FixedStep
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label>{step.label}</label>
      {step.key === 'notes' ? (
        <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} autoFocus />
      ) : step.key === 'date' || step.key === 'deliveryDate' ? (
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)} autoFocus />
      ) : step.key === 'totalAmount' || step.key === 'amountPaid' ? (
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} autoFocus />
      )}
    </div>
  )
}

function CategoryFieldInput({
  category,
  value,
  onChange,
}: {
  category: Category
  value: CategoryValue | undefined
  onChange: (v: CategoryValue) => void
}) {
  if (category.type === 'yes_no_na') {
    const current = value?.valueText ?? null
    return (
      <div>
        <label>{category.name}</label>
        <div className="yes-no-na-group">
          {(['yes', 'no', 'na'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              className={current === opt ? 'selected' : ''}
              onClick={() => onChange({ valueText: opt, optionId: null })}
            >
              {opt === 'na' ? 'N/A' : opt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // select type — include the currently-chosen option even if it's since been archived
  const options = [...category.options.filter((o) => o.active)]
  if (value?.optionId != null && !options.find((o) => o.id === value.optionId)) {
    const archived = category.options.find((o) => o.id === value.optionId)
    if (archived) options.push(archived)
  }

  return (
    <div>
      <label>{category.name}</label>
      <select
        value={value?.optionId ?? ''}
        onChange={(e) => onChange({ optionId: e.target.value ? Number(e.target.value) : null, valueText: null })}
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.value}
            {!o.active ? ' (archived)' : ''}
          </option>
        ))}
      </select>
      {options.length === 0 && (
        <p className="error-text">No options configured yet — add some in the Audit tab's category settings.</p>
      )}
    </div>
  )
}
