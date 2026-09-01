import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { Category, CategoryType } from '../types'

export function CategoryAdmin() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<CategoryType>('select')

  const [newOptionValue, setNewOptionValue] = useState<Record<number, string>>({})

  const load = useCallback(() => {
    setLoading(true)
    api
      .getCategories()
      .then(setCategories)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleAddCategory = async () => {
    if (!newName.trim()) return
    try {
      await api.createCategory(newName.trim(), newType)
      setNewName('')
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add category')
    }
  }

  const toggleCategoryActive = async (c: Category) => {
    try {
      await api.updateCategory(c.id, { active: !c.active })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update category')
    }
  }

  const handleAddOption = async (categoryId: number) => {
    const value = (newOptionValue[categoryId] ?? '').trim()
    if (!value) return
    try {
      await api.createOption(categoryId, value)
      setNewOptionValue((prev) => ({ ...prev, [categoryId]: '' }))
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add option')
    }
  }

  const toggleOptionActive = async (categoryId: number, optionId: number, active: boolean) => {
    try {
      await api.updateOption(categoryId, optionId, { active: !active })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update option')
    }
  }

  if (loading) return <p>Loading...</p>

  return (
    <div>
      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <h2>Add a category</h2>
        <p style={{ color: 'var(--text-dim)', marginTop: 0 }}>
          Like adding a column in Excel — new categories automatically become a step in the entry wizard.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label>Name</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Financing Used" />
          </div>
          <div style={{ width: '180px' }}>
            <label>Type</label>
            <select value={newType} onChange={(e) => setNewType(e.target.value as CategoryType)}>
              <option value="select">Pick from a list</option>
              <option value="yes_no_na">Yes / No / N-A</option>
            </select>
          </div>
          <button className="btn" onClick={handleAddCategory}>
            Add
          </button>
        </div>
      </div>

      {categories
        .sort((a, b) => a.position - b.position)
        .map((c) => (
          <div className="card" key={c.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0 }}>{c.name}</h2>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  {c.type === 'select' ? 'Pick from a list' : 'Yes / No / N-A'}
                  {c.dependsOnCategoryId != null && ' · conditional field'}
                </p>
              </div>
              <button className="btn-secondary" onClick={() => toggleCategoryActive(c)}>
                {c.active ? 'Archive' : 'Reactivate'}
              </button>
            </div>

            {c.type === 'select' && (
              <div style={{ marginTop: '1rem' }}>
                <table>
                  <tbody>
                    {c.options.length === 0 ? (
                      <tr>
                        <td>No options yet</td>
                        <td></td>
                      </tr>
                    ) : (
                      c.options
                        .sort((a, b) => a.position - b.position)
                        .map((o) => (
                          <tr key={o.id}>
                            <td>
                              {o.value} {!o.active && <span className="badge badge-na">archived</span>}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn-secondary"
                                onClick={() => toggleOptionActive(c.id, o.id, o.active)}
                              >
                                {o.active ? 'Archive' : 'Reactivate'}
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="Add option..."
                    value={newOptionValue[c.id] ?? ''}
                    onChange={(e) => setNewOptionValue((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddOption(c.id)}
                  />
                  <button className="btn-secondary" onClick={() => handleAddOption(c.id)}>
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  )
}
