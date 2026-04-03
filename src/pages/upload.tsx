import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseSpreadsheet, type ParseResult } from '../lib/parser'
import type { Product } from '../types'

const Upload = () => {
    const navigate = useNavigate()

    const [isDragging, setIsDragging] = useState(false)
    const [fileName, setFileName] = useState('')
    const [status, setStatus] = useState<'idle' | 'parsing' | 'done' | 'error'>('idle')
    const [result, setResult] = useState<ParseResult | null>(null)

    const handleFile = async (file: File) => {
        const allowedExtensions = ['.xlsx', '.xls', '.csv', '.ods']
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
        if (!allowedExtensions.includes(ext)) {
            setStatus('error')
            return
        }

        setFileName(file.name)
        setStatus('parsing')

        try {
            const parsed = await parseSpreadsheet(file)
            setResult(parsed)
            setStatus('done')

            if (parsed.valid) {
                const existing = localStorage.getItem('qs_current_snapshot')
                if (existing) {
                    localStorage.setItem('qs_previous_snapshot', existing)
                    localStorage.setItem('qs_previous_filename',
                        localStorage.getItem('qs_current_filename') ?? ''
                    )
                }
                localStorage.setItem('qs_current_snapshot', JSON.stringify(parsed.products))
                localStorage.setItem('qs_current_filename', file.name)
                localStorage.setItem('qs_current_date', new Date().toISOString())
            }

        } catch (err) {
            setStatus('error')
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
    }

    const handleCompare = () => {
        navigate('/quick-ship/review')
    }

    return (
        <div className="min-h-screen p-8 transition-colors duration-300" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
            <div className="max-w-xl mx-auto">

                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-h)' }}>Upload stock file</h1>
                <p className="text-sm mb-8" style={{ color: 'var(--text)', opacity: 0.8 }}>Upload today's NetSuite export to compare against previous</p>

                {/* Drop zone */}
                <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-12 text-center mb-6 transition-all duration-300 ${isDragging
                        ? 'border-[var(--accent-border)] bg-[var(--accent-bg)] scale-[1.02]'
                        : 'border-[var(--border)] hover:border-[var(--text-h)]'
                        }`}
                    style={{ backgroundColor: !isDragging ? 'var(--code-bg)' : undefined }}
                >
                    <div className="text-4xl mb-4" style={{ animation: isDragging ? 'pulse 2s infinite' : 'float 3s ease-in-out infinite' }}>📂</div>
                    <p className="text-lg font-medium mb-1" style={{ color: 'var(--text-h)' }}>Drop your spreadsheet file here</p>
                    <p className="text-sm mb-6" style={{ color: 'var(--text)', opacity: 0.7 }}>or click to browse</p>
                    <label className="primary-btn cursor-pointer inline-block !py-3 !px-6 !text-sm">
                        Browse file
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv,.ods"
                            onChange={handleInputChange}
                            className="hidden"
                        />
                    </label>
                </div>

                {/* Validation result */}
                {status === 'parsing' && (
                    <div className="rounded-xl p-6 mb-4 flex items-center justify-center space-x-3 transition-opacity" style={{ backgroundColor: 'var(--code-bg)', border: '1px solid var(--border)' }}>
                        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--text-h)', borderTopColor: 'transparent' }}></div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-h)' }}>Reading file...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="rounded-xl p-6 mb-4 animate-in fade-in slide-in-from-bottom-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">Invalid file</p>
                        <p className="text-xs text-red-600 dark:text-red-300 mt-1 opacity-80">Make sure you're uploading a supported spreadsheet file (.xlsx, .xls, .csv, etc.)</p>
                    </div>
                )}

                {status === 'done' && result && (
                    <div className="rounded-xl p-6 mb-6 shadow-sm animate-in fade-in slide-in-from-bottom-2" style={{ backgroundColor: 'var(--code-bg)', border: '1px solid var(--border)' }}>
                        <p className="text-xs mb-5 font-mono flex items-center gap-2" style={{ color: 'var(--text)', opacity: 0.7 }}>
                            <span className="text-lg">📄</span> {fileName}
                        </p>

                        {/* Column validation */}
                        <div className="space-y-3 mb-8">
                            {['Display Name', 'Description', 'Revesby Warehouse - SOH'].map(col => {
                                const found = !result.missingColumns.includes(col)
                                return (
                                    <div key={col} className="flex items-center justify-between py-1 border-b border-dashed" style={{ borderBottomColor: 'var(--border)' }}>
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-h)' }}>{col}</span>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${found
                                            ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
                                            : 'bg-red-900/50 text-red-400 border border-red-800'
                                            }`}>
                                            {found ? '✓ Found' : '✕ Missing'}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Preview */}
                        {result.valid && result.products.length > 0 && (
                            <>
                                <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-h)' }}>
                                    Preview ({result.products.length} products)
                                </p>
                                <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
                                    <table className="w-full text-xs text-left">
                                        <thead style={{ backgroundColor: 'var(--accent-bg)', borderBottom: '1px solid var(--border)' }}>
                                            <tr>
                                                <th className="py-3 px-4 font-semibold" style={{ color: 'var(--text-h)' }}>Product Name</th>
                                                <th className="py-3 px-4 font-semibold text-right" style={{ color: 'var(--text-h)' }}>Stock</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.products.slice(0, 5).map((p: Product, i: number) => (
                                                <tr key={i} className="border-b last:border-0 hover:bg-black/5 transition-colors" style={{ borderBottomColor: 'var(--border)' }}>
                                                    <td className="py-3 px-4 font-medium max-w-xs truncate" style={{ color: 'var(--text)' }}>{p.name}</td>
                                                    <td className="py-3 px-4 text-right font-mono" style={{ color: 'var(--text)' }}>{p.stock}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {!result.valid && (
                            <div className="mt-4 p-4 rounded-lg bg-red-900/20 border border-red-900/50">
                                <p className="text-sm font-medium text-red-400">
                                    Missing expected columns: <span className="font-mono bg-red-900/50 px-1 rounded">{result.missingColumns.join(', ')}</span>
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Action button */}
                {status === 'done' && result?.valid && (
                    <button
                        onClick={handleCompare}
                        className="primary-btn w-full flex items-center justify-center gap-2 group animate-in fade-in"
                    >
                        Process and compare
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                )}

            </div>
        </div>
    )
}

export default Upload