import { useState, useEffect } from 'react'
import { compareSnapshots, type CompareResult, type CompareSettings } from '../lib/compare'
import type { Product } from '../types'
import { supabase } from '../lib/supabase'

type TabType = 'all' | 'add' | 'remove' | 'new' | 'unmatched'

const Review = () => {
    const [results, setResults] = useState<CompareResult[]>([])
    const [activeTab, setActiveTab] = useState<TabType>('all')
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [loading, setLoading] = useState(true)
    const [savingBase, setSavingBase] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [baseFileName, setBaseFileName] = useState<string>('No base file')
    const [newFileName, setNewFileName] = useState<string>('No new file')
    const [hasNewFile, setHasNewFile] = useState(false)

    useEffect(() => {
        const fetchSnapshots = async () => {
            setLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setLoading(false)
                    return
                }

                if (user.user_metadata) {
                    setBaseFileName(user.user_metadata.qs_base_filename || 'No base file')
                    setNewFileName(user.user_metadata.qs_new_filename || 'No new file')
                    setHasNewFile(!!user.user_metadata.qs_new_filename)
                }

                const [baseRes, newRes] = await Promise.all([
                    supabase.storage.from('Stock_Uploads').download(`${user.id}/base_snapshot.json`),
                    supabase.storage.from('Stock_Uploads').download(`${user.id}/new_snapshot.json`)
                ])

                const ignoreErrors = ["The resource was not found", "Object not found"]
                if (baseRes.error && !ignoreErrors.includes(baseRes.error.message)) {
                    alert(`Error downloading Base File: ${baseRes.error.message}. Please check bucket RLS policies!`)
                }
                if (newRes.error && !ignoreErrors.includes(newRes.error.message)) {
                    alert(`Error downloading New File: ${newRes.error.message}. Please check bucket RLS policies!`)
                }

                let previous: Product[] = []
                let current: Product[] = []

                if (baseRes.data) {
                    try {
                        const text = await baseRes.data.text()
                        if (text) {
                            previous = JSON.parse(text)
                        }
                    } catch (e) {
                        alert("Error parsing base snapshot data.")
                    }
                }
                
                if (newRes.data) {
                    try {
                        const text = await newRes.data.text()
                        if (text) {
                            current = JSON.parse(text)
                        }
                    } catch (e) {
                        alert("Error parsing new snapshot data.")
                    }
                }

                // If the user ONLY uploaded a Base File (or ONLY a New File),
                // we want it to act as the "current" file so it gets evaluated against thresholds.
                if (previous.length > 0 && current.length === 0) {
                    current = previous
                    previous = []
                } else if (current.length > 0 && previous.length === 0) {
                    // This explicitly ensures that if ONLY new file is uploaded, it evaluates as current against nothing.
                    // This is technically already true because previous = []
                }

                // If only New File was provided, it will be checked against initial thresholds
                // logic handles this accurately (compareSnapshots handles previous = [])

                const settings: CompareSettings = {
                    normalThreshold: Number(localStorage.getItem('qs_normal_threshold') ?? 6),
                    chairThreshold: Number(localStorage.getItem('qs_chair_threshold') ?? 8),
                    keywords: JSON.parse(localStorage.getItem('qs_keywords') ?? '["dining chair","chair","dc"]')
                }

                const compared = compareSnapshots(previous, current, settings)
                setResults(compared)
            } catch (err) {
                console.error("Failed to fetch snapshots", err)
            } finally {
                setLoading(false)
            }
        }

        fetchSnapshots()
    }, [])

    const handleSetAsBaseForNextTime = async () => {
        setSavingBase(true)
        setSuccessMessage(null)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not logged in")

            // Copy new_snapshot to base_snapshot. We can do this by downloading new and uploading over base
            const { data: newFileObj, error: dlErr } = await supabase.storage.from('Stock_Uploads').download(`${user.id}/new_snapshot.json`)
            if (dlErr || !newFileObj) throw new Error("Failed to read new snapshot")

            const { error: upError } = await supabase.storage.from('Stock_Uploads').upload(`${user.id}/base_snapshot.json`, newFileObj, { upsert: true })
            if (upError) throw new Error(`Supabase upload error: ${upError.message}`)
            
            // Remove the new_snapshot from storage
            const { error: rmError } = await supabase.storage.from('Stock_Uploads').remove([`${user.id}/new_snapshot.json`])
            if (rmError) throw new Error(`Supabase remove error: ${rmError.message}`)

            // Update user metadata 
            const md = user.user_metadata
            const newName = md.qs_new_filename
            const newDate = md.qs_new_date

            await supabase.auth.updateUser({
                data: {
                    qs_base_filename: newName,
                    qs_base_date: newDate,
                    qs_new_filename: null,
                    qs_new_date: null
                }
            })

            setBaseFileName(newName || 'Copied Base File')
            setNewFileName('No new file')
            setHasNewFile(false)
            setSuccessMessage("Successfully set as the new Base file!")
            setTimeout(() => setSuccessMessage(null), 5000)

        } catch (err: any) {
            console.error(err)
            alert("Error setting base file: " + err.message)
        } finally {
            setSavingBase(false)
        }
    }

    const filtered = results.filter(r => {
        if (activeTab === 'add' && r.action !== 'add') return false
        if (activeTab === 'remove' && r.action !== 'remove') return false
        if (activeTab === 'new' && r.action !== 'new') return false
        if (activeTab === 'unmatched' && r.action !== 'unmatched') return false
        if (activeTab === 'all' && (r.action === 'none')) return false
        if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
        if (categoryFilter && r.category !== categoryFilter) return false
        return true
    })

    const count = (tab: TabType) => {
        if (tab === 'all') return results.filter(r => r.action !== 'none').length
        return results.filter(r => r.action === tab).length
    }

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'add':
                return <span className="bg-[#38bdf8]/30 text-[#f8fafc] border border-[#38bdf8]/50 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">Add quick ship</span>
            case 'remove':
                return <span className="bg-[#1e293b]/30 text-[#f8fafc] border border-[#1e293b]/50 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">Remove quick ship</span>
            case 'new':
                return <span className="bg-[rgba(30,41,59,0.5)] text-[#f8fafc] border border-[#f8fafc]/20 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">New product</span>
            case 'unmatched':
                return <span className="bg-[#0f172a]/60 text-[#f8fafc] border border-[#f8fafc]/20 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">Unmatched</span>
            default:
                return null
        }
    }

    const handleExport = () => {
        const rows = filtered.map(r => [
            r.name,
            r.category,
            r.previousStock,
            r.currentStock,
            r.threshold,
            r.action,
            r.reason
        ])

        const header = ['Product Name', 'Category', 'Prev Stock', 'Curr Stock', 'Threshold', 'Action', 'Reason']
        const csv = [header, ...rows].map(r => r.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `quickship_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const tabs: { key: TabType; label: string }[] = [
        { key: 'all', label: 'All flagged' },
        { key: 'add', label: 'Add quick ship' },
        { key: 'remove', label: 'Remove quick ship' },
        { key: 'new', label: 'New products' },
        { key: 'unmatched', label: 'Unmatched' }
    ]

    return (
        <div className="min-h-screen bg-transparent p-4 sm:p-8">
            <div className="max-w-6xl mx-auto bg-[rgba(30,41,59,0.5)] backdrop-blur-xl border-2 border-[#1e293b]/60 rounded-[2rem] p-6 sm:p-10 shadow-[0_8px_32px_rgba(129,166,198,0.15)] relative">

                {/* Success Message Banner */}
                {successMessage && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-900/90 text-emerald-300 border border-emerald-500/50 px-6 py-2 rounded-2xl shadow-lg z-50 animate-in fade-in slide-in-from-top-4 font-bold text-sm flex items-center gap-2">
                        <span>✓</span> {successMessage}
                    </div>
                )}

                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl font-extrabold text-[#f8fafc] tracking-tight">Review actions</h1>
                    <div className="flex gap-3">
                        {hasNewFile && (
                            <button
                                onClick={handleSetAsBaseForNextTime}
                                disabled={savingBase}
                                className="bg-[#38bdf8]/10 hover:bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30 shadow-sm text-sm px-4 py-2.5 rounded-2xl transition-all font-bold active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingBase ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>🏛️ Set New as Base</>
                                )}
                            </button>
                        )}
                        <button
                            onClick={handleExport}
                            className="bg-[#f8fafc] hover:bg-[#38bdf8] text-[#0f172a] shadow-md shadow-[#f8fafc]/30 text-sm px-6 py-2.5 rounded-2xl transition-all font-bold active:scale-95 border border-transparent"
                        >
                            Export CSV
                        </button>
                    </div>
                </div>

                <div className="flex flex-col mb-8 mt-4 gap-2">
                    <div className="flex items-center gap-3">
                        <span className="text-xs uppercase tracking-wider font-bold text-[#f8fafc]/40 w-16">Base</span>
                        <span className="text-sm font-semibold text-[#f8fafc]/80 bg-[#1e293b]/50 px-3 py-1 rounded-lg border border-[#1e293b]">{baseFileName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs uppercase tracking-wider font-bold text-[#f8fafc]/40 w-16">New</span>
                        <span className="text-sm font-semibold text-[#38bdf8] bg-[#38bdf8]/10 px-3 py-1 rounded-lg border border-[#38bdf8]/30">{newFileName}</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-[#38bdf8] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-[#f8fafc]/80 font-bold">Loading snapshots from cloud...</p>
                    </div>
                ) : (
                    <>
                        {/* Summary bar */}
                        <div className="flex gap-6 mb-8 bg-[rgba(30,41,59,0.5)] backdrop-blur-md border border-[#1e293b]/60 rounded-3xl p-5 shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-sm"></div>
                                <span className="text-sm font-bold text-[#f8fafc]">{count('add')} to add</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#1e293b] shadow-sm"></div>
                                <span className="text-sm font-bold text-[#f8fafc]">{count('remove')} to remove</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-white border border-[#38bdf8] shadow-sm"></div>
                                <span className="text-sm font-bold text-[#f8fafc]">{count('new')} new products</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#0f172a] shadow-sm"></div>
                                <span className="text-sm font-bold text-[#f8fafc]">{count('unmatched')} unmatched</span>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 border-b-2 border-[#1e293b]/30 mb-6 pb-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`px-5 py-2.5 text-sm rounded-2xl transition-all font-bold ${activeTab === tab.key
                                        ? 'bg-[#f8fafc] text-[#0f172a] shadow-md shadow-[#f8fafc]/20'
                                        : 'bg-transparent text-[#f8fafc]/70 hover:bg-[rgba(30,41,59,0.5)] hover:text-[#f8fafc]'
                                        }`}
                                >
                                    {tab.label}
                                    <span className={`ml-2 text-xs px-2 py-1 rounded-full ${activeTab === tab.key
                                        ? 'bg-[#0f172a]/30 text-[#0f172a]'
                                        : 'bg-[rgba(30,41,59,0.5)] text-[#f8fafc]'
                                        }`}>
                                        {count(tab.key)}
                                    </span>
                                </button>
                            ))}
                        </div>

                {/* Filters */}
                <div className="flex gap-3 mb-6">
                    <input
                        type="text"
                        placeholder="Search product..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-[rgba(30,41,59,0.5)] border border-[#1e293b] focus:border-[#38bdf8] focus:outline-none focus:ring-4 focus:ring-[#38bdf8]/30 rounded-2xl px-4 py-2.5 text-sm w-64 text-[#f8fafc] placeholder-[#f8fafc]/50 font-bold transition-all"
                    />
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="bg-[rgba(30,41,59,0.5)] border border-[#1e293b] focus:border-[#38bdf8] focus:outline-none focus:ring-4 focus:ring-[#38bdf8]/30 rounded-2xl px-4 py-2.5 text-sm text-[#f8fafc] font-bold transition-all appearance-none outline-none"
                    >
                        <option value="">All categories</option>
                        <option>Normal item</option>
                        <option>Dining chair</option>
                    </select>
                </div>

                {/* Table */}
                <div className="bg-[rgba(30,41,59,0.5)] backdrop-blur-sm border border-[#1e293b]/60 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                        <thead>
                            <tr className="bg-[#0f172a]/40 border-b border-[#1e293b]/50">
                                <th className="text-left py-4 px-5 text-xs font-bold text-[#f8fafc] uppercase tracking-wider" style={{ width: '28%' }}>Product name</th>
                                <th className="text-left py-4 px-5 text-xs font-bold text-[#f8fafc] uppercase tracking-wider" style={{ width: '13%' }}>Category</th>
                                <th className="text-left py-4 px-5 text-xs font-bold text-[#f8fafc] uppercase tracking-wider" style={{ width: '10%' }}>Prev stock</th>
                                <th className="text-left py-4 px-5 text-xs font-bold text-[#f8fafc] uppercase tracking-wider" style={{ width: '10%' }}>Curr stock</th>
                                <th className="text-left py-4 px-5 text-xs font-bold text-[#f8fafc] uppercase tracking-wider" style={{ width: '10%' }}>Threshold</th>
                                <th className="text-left py-4 px-5 text-xs font-bold text-[#f8fafc] uppercase tracking-wider" style={{ width: '16%' }}>Action</th>
                                <th className="text-left py-4 px-5 text-xs font-bold text-[#f8fafc] uppercase tracking-wider" style={{ width: '13%' }}>Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e293b]/30">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-[#f8fafc]/60 text-sm font-bold">
                                        No items match this filter
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((r, i) => (
                                    <tr key={i} className="hover:bg-[rgba(30,41,59,0.5)] transition-colors">
                                        <td className="py-4 px-5 font-bold text-[#f8fafc] truncate" title={r.name}>{r.name}</td>
                                        <td className="py-4 px-5">
                                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${r.category === 'Dining chair'
                                                ? 'bg-[#38bdf8]/20 text-[#f8fafc] border-[#38bdf8]/50'
                                                : 'bg-[rgba(30,41,59,0.5)] text-[#f8fafc] border-[#1e293b]/50'
                                                }`}>
                                                {r.category === 'Dining chair' ? 'Chair' : 'Normal'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 font-semibold text-[#f8fafc]/80">{r.previousStock}</td>
                                        <td className={`py-4 px-5 font-bold ${r.currentStock > r.previousStock ? 'text-[#38bdf8]' :
                                            r.currentStock < r.previousStock ? 'text-[#1e293b]' : 'text-[#f8fafc]'
                                            }`}>
                                            {r.currentStock}
                                        </td>
                                        <td className="py-4 px-5 font-semibold text-[#f8fafc]/80">{r.threshold}</td>
                                        <td className="py-4 px-5">{getActionBadge(r.action)}</td>
                                        <td className="py-4 px-5 font-semibold text-[#f8fafc]/60 text-xs truncate" title={r.reason}>{r.reason}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                </>
                )}

            </div>
        </div>
    )
}

export default Review