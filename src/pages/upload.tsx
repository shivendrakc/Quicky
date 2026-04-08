import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseSpreadsheet } from '../lib/parser'
import { supabase } from '../lib/supabase'

type UploadSlot = 'base' | 'new'

const Upload = () => {
    const navigate = useNavigate()

    const [dragActiveBase, setDragActiveBase] = useState(false)
    const [dragActiveNew, setDragActiveNew] = useState(false)
    
    const [statusBase, setStatusBase] = useState<'idle' | 'parsing' | 'saving' | 'done' | 'error'>('idle')
    const [statusNew, setStatusNew] = useState<'idle' | 'parsing' | 'saving' | 'done' | 'error'>('idle')
    
    const [errBase, setErrBase] = useState<string | null>(null)
    const [errNew, setErrNew] = useState<string | null>(null)

    const [baseFileName, setBaseFileName] = useState<string | null>(null)
    const [baseFileDate, setBaseFileDate] = useState<string | null>(null)
    
    const [newFileName, setNewFileName] = useState<string | null>(null)
    const [newFileDate, setNewFileDate] = useState<string | null>(null)

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.user_metadata) {
                setBaseFileName(user.user_metadata.qs_base_filename || null)
                setBaseFileDate(user.user_metadata.qs_base_date || null)
                setNewFileName(user.user_metadata.qs_new_filename || null)
                setNewFileDate(user.user_metadata.qs_new_date || null)
            }
        }
        fetchUserData()
    }, [])

    const handleClearSlot = async (slot: UploadSlot) => {
        const setStatus = slot === 'base' ? setStatusBase : setStatusNew
        setStatus('saving')
        
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const snapshotName = slot === 'base' ? 'base_snapshot.json' : 'new_snapshot.json'
                await supabase.storage.from('Stock_Uploads').remove([`${user.id}/${snapshotName}`])
                
                const updates = slot === 'base' 
                    ? { qs_base_filename: null, qs_base_date: null }
                    : { qs_new_filename: null, qs_new_date: null }
                
                await supabase.auth.updateUser({ data: updates })
            }
            if (slot === 'base') {
                setBaseFileName(null)
                setBaseFileDate(null)
            } else {
                setNewFileName(null)
                setNewFileDate(null)
            }
        } finally {
            setStatus('idle')
        }
    }

    const processFile = async (file: File, slot: UploadSlot) => {
        const setStatus = slot === 'base' ? setStatusBase : setStatusNew
        const setErr = slot === 'base' ? setErrBase : setErrNew
        
        const allowedExtensions = ['.xlsx', '.xls', '.csv', '.ods']
        const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
        if (!allowedExtensions.includes(ext)) {
            setStatus('error')
            setErr("Unsupported file format.")
            return
        }

        setStatus('parsing')
        setErr(null)

        try {
            const parsed = await parseSpreadsheet(file)

            if (!parsed.valid) {
                 setStatus('error')
                 setErr(`Missing columns: ${parsed.missingColumns.join(', ')}`)
                 return
            }

            setStatus('saving')
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not logged in")

            const snapshotName = slot === 'base' ? 'base_snapshot.json' : 'new_snapshot.json'
            const jsonBlob = new Blob([JSON.stringify(parsed.products)], { type: 'application/json' })
            
            const { error: uploadError } = await supabase.storage.from('Stock_Uploads').upload(
                `${user.id}/${snapshotName}`, 
                jsonBlob, 
                { upsert: true }
            )

            if (uploadError) {
                console.error("Upload error:", uploadError);
                throw new Error(uploadError.message || "Failed to upload to Supabase bucket. Check your bucket policies.");
            }

            const newDate = new Date().toISOString()
            const updates = slot === 'base' 
                ? { qs_base_filename: file.name, qs_base_date: newDate }
                : { qs_new_filename: file.name, qs_new_date: newDate }

            await supabase.auth.updateUser({ data: updates })

            if (slot === 'base') {
                setBaseFileName(file.name)
                setBaseFileDate(newDate)
            } else {
                setNewFileName(file.name)
                setNewFileDate(newDate)
            }
            
            setStatus('done')
            
            // clear success state back to idle after a bit
            setTimeout(() => setStatus('idle'), 3000)
            
        } catch (err: any) {
            setStatus('error')
            setErr(err.message || 'An error occurred processing the file')
        }
    }

    const handleDrop = (e: React.DragEvent, slot: UploadSlot) => {
        e.preventDefault()
        if (slot === 'base') setDragActiveBase(false)
        else setDragActiveNew(false)
        
        const file = e.dataTransfer.files[0]
        if (file) processFile(file, slot)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, slot: UploadSlot) => {
        const file = e.target.files?.[0]
        if (file) processFile(file, slot)
    }

    const renderDropZone = (slot: UploadSlot) => {
        const isBase = slot === 'base'
        const dragActive = isBase ? dragActiveBase : dragActiveNew
        const status = isBase ? statusBase : statusNew
        const err = isBase ? errBase : errNew
        const activeName = isBase ? baseFileName : newFileName
        const activeDate = isBase ? baseFileDate : newFileDate
        
        const title = isBase ? "Base File" : "New File"
        const desc = isBase 
            ? "Historical file to compare against" 
            : "Latest export to analyze"

        return (
            <div className="flex-1 flex flex-col min-w-0 bg-[rgba(30,41,59,0.3)] border border-[#1e293b]/60 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#38bdf8]/50 to-transparent opacity-0 transition-opacity"></div>
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-[#f8fafc] flex items-center gap-2">
                        {isBase ? '🏛️' : '🆕'} {title}
                    </h2>
                    <p className="text-xs font-semibold text-[#f8fafc]/50 mt-1">{desc}</p>
                </div>

                {/* Active File Banner */}
                {activeName ? (
                    <div className="mb-4 rounded-xl p-4 flex items-center justify-between border border-[#38bdf8]/30 bg-[#38bdf8]/5">
                        <div className="min-w-0 pr-4">
                            <p className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider mb-1">Loaded</p>
                            <p className="text-sm font-bold text-[#f8fafc] truncate">{activeName}</p>
                            <p className="text-xs font-semibold text-[#f8fafc]/50 mt-0.5 truncate">
                                {activeDate ? new Date(activeDate).toLocaleString() : ''}
                            </p>
                        </div>
                        <button
                            onClick={() => handleClearSlot(slot)}
                            disabled={status === 'saving'}
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-900/20 text-red-400 hover:bg-red-400 hover:text-white transition-colors disabled:opacity-50"
                            title="Clear file"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <div className="mb-4 rounded-xl p-4 border border-dashed border-[#1e293b] flex items-center justify-center bg-[#0f172a]/30 h-[82px]">
                        <p className="text-xs font-bold text-[#f8fafc]/30">No file loaded</p>
                    </div>
                )}

                {/* Drop Zone */}
                <div
                    onDragOver={e => { e.preventDefault(); isBase ? setDragActiveBase(true) : setDragActiveNew(true) }}
                    onDragLeave={() => isBase ? setDragActiveBase(false) : setDragActiveNew(false)}
                    onDrop={e => handleDrop(e, slot)}
                    className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[160px] ${
                        dragActive
                        ? 'border-[#38bdf8] bg-[#38bdf8]/10 scale-[1.02]'
                        : 'border-[#1e293b] hover:border-[#f8fafc]/30 bg-[rgba(30,41,59,0.3)]'
                    }`}
                >
                    {status === 'parsing' || status === 'saving' ? (
                        <div className="flex flex-col items-center justify-center">
                            <div className="w-8 h-8 border-4 border-[#38bdf8] border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="text-sm font-bold text-[#38bdf8]">
                                {status === 'parsing' ? 'Reading file...' : 'Saving to cloud...'}
                            </p>
                        </div>
                    ) : status === 'done' ? (
                        <div className="flex flex-col items-center justify-center animate-in zoom-in fade-in">
                            <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2">
                                ✓
                            </div>
                            <p className="text-sm font-bold text-emerald-400">Success!</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-3xl mb-3 opacity-80" style={{ animation: dragActive ? 'pulse 2s infinite' : 'float 3s ease-in-out infinite' }}>📂</div>
                            <p className="text-xs font-bold text-[#f8fafc]/70 mb-4 px-2">Drag and drop, or browse</p>
                            <label className="bg-[#1e293b] hover:bg-[#38bdf8] hover:text-[#0f172a] text-[#f8fafc] text-xs px-5 py-2.5 rounded-lg font-bold transition-all cursor-pointer shadow-sm active:scale-95">
                                Browse file
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv,.ods"
                                    onChange={e => handleInputChange(e, slot)}
                                    className="hidden"
                                />
                            </label>
                        </>
                    )}
                </div>

                {status === 'error' && (
                    <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-900/50 animate-in fade-in">
                        <p className="text-xs font-bold text-red-400 mb-0.5">Upload failed</p>
                        <p className="text-[11px] font-semibold text-red-300 opacity-80 line-clamp-2" title={err || ''}>{err}</p>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-[#f8fafc] tracking-tight mb-2">Configure Analysis</h1>
                    <p className="text-sm font-semibold text-[#f8fafc]/60 max-w-xl">
                        Upload a historical file alongside today's export. If you only upload a New File, it will exclusively check for valid initial thresholds.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-6 mb-8">
                    {renderDropZone('base')}
                    {renderDropZone('new')}
                </div>

                {/* Compare Action */}
                <div className="flex justify-end pt-4 border-t border-[#1e293b]/50">
                    <button
                        onClick={() => navigate('/dashboard/review')}
                        disabled={!newFileName && !baseFileName}
                        className="bg-[#f8fafc] hover:bg-[#38bdf8] text-[#0f172a] shadow-lg shadow-[#f8fafc]/10 text-sm px-8 py-3.5 rounded-2xl transition-all font-extrabold active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent flex items-center gap-2 group"
                    >
                        Process and compare
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </div>

            </div>
        </div>
    )
}

export default Upload