import { useState } from 'react'

const Settings = () => {

    const [normalThreshold, setNormalThreshold] = useState(6)
    const [chairThreshold, setChairThreshold] = useState(8)
    const [keywords, setKeywords] = useState(['dining chair', 'chair', 'dc'])
    const [newKeyword, setNewKeyword] = useState('')

    const handleSave = () => {
        localStorage.setItem('qs_normal_threshold', String(normalThreshold))
        localStorage.setItem('qs_chair_threshold', String(chairThreshold))
        localStorage.setItem('qs_keywords', JSON.stringify(keywords))
        alert('Settings saved!')
    }

    const addKeyword = () => {
        if (newKeyword.trim() === '') return
        setKeywords([...keywords, newKeyword.trim().toLowerCase()])
        setNewKeyword('')
    }

    const removeKeyword = (index: number) => {
        setKeywords(keywords.filter((_, i) => i !== index))
    }

    return (
        <div className="bg-transparent p-4 sm:p-8 flex items-center justify-center">
            <div className="max-w-xl w-full mx-auto bg-[rgba(30,41,59,0.5)] backdrop-blur-xl border-2 border-[#1e293b]/60 rounded-[2rem] p-6 sm:p-10 shadow-[0_8px_32px_rgba(129,166,198,0.15)]">

                <h1 className="text-3xl font-extrabold text-[#f8fafc] mb-2 tracking-tight">Settings</h1>
                <p className="text-sm font-medium text-[#f8fafc]/80 mb-8">Configure thresholds and classification rules</p>

                {/* Thresholds */}
                <div className="bg-[rgba(30,41,59,0.5)] backdrop-blur-md border border-[#1e293b]/60 rounded-3xl p-6 mb-5 shadow-sm">
                    <h2 className="text-[11px] font-bold text-[#f8fafc] mb-4 uppercase tracking-widest opacity-80">Stock thresholds</h2>

                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <p className="text-sm font-bold text-[#f8fafc]">Normal item threshold</p>
                            <p className="text-xs font-semibold text-[#f8fafc]/70 mt-1">At or above this is quick ship</p>
                        </div>
                        <input
                            type="number"
                            value={normalThreshold}
                            onChange={e => setNormalThreshold(Number(e.target.value))}
                            className="w-20 bg-[rgba(30,41,59,0.5)] border border-[#1e293b] focus:border-[#38bdf8] focus:outline-none focus:ring-4 focus:ring-[#38bdf8]/30 rounded-2xl px-3 py-2 text-sm text-center text-[#f8fafc] font-bold transition-all"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-[#f8fafc]">Dining chair threshold</p>
                            <p className="text-xs font-semibold text-[#f8fafc]/70 mt-1">Separate threshold for chairs</p>
                        </div>
                        <input
                            type="number"
                            value={chairThreshold}
                            onChange={e => setChairThreshold(Number(e.target.value))}
                            className="w-20 bg-[rgba(30,41,59,0.5)] border border-[#1e293b] focus:border-[#38bdf8] focus:outline-none focus:ring-4 focus:ring-[#38bdf8]/30 rounded-2xl px-3 py-2 text-sm text-center text-[#f8fafc] font-bold transition-all"
                        />
                    </div>
                </div>

                {/* Keywords */}
                <div className="bg-[rgba(30,41,59,0.5)] backdrop-blur-md border border-[#1e293b]/60 rounded-3xl p-6 mb-8 shadow-sm">
                    <h2 className="text-[11px] font-bold text-[#f8fafc] mb-4 uppercase tracking-widest opacity-80">Classification keywords</h2>
                    <p className="text-xs font-semibold text-[#f8fafc]/80 mb-4">Products matching these words are classified as dining chairs</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {keywords.map((kw, i) => (
                            <span key={i} className="flex items-center gap-1.5 bg-[rgba(30,41,59,0.5)] border border-[#1e293b]/50 shadow-sm text-[#f8fafc] font-bold text-xs px-3 py-1.5 rounded-2xl">
                                {kw}
                                <button onClick={() => removeKeyword(i)} className="text-[#f8fafc]/60 hover:text-[#38bdf8] transition-colors">✕</button>
                            </span>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newKeyword}
                            onChange={e => setNewKeyword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addKeyword()}
                            placeholder="Add keyword..."
                            className="flex-1 bg-[rgba(30,41,59,0.5)] border border-[#1e293b] focus:border-[#38bdf8] focus:outline-none focus:ring-4 focus:ring-[#38bdf8]/30 rounded-2xl px-4 py-2.5 text-sm text-[#f8fafc] placeholder-[#f8fafc]/50 font-bold transition-all"
                        />
                        <button
                            onClick={addKeyword}
                            className="bg-[#f8fafc] hover:bg-[#38bdf8] text-[#0f172a] shadow-md shadow-[#f8fafc]/30 text-sm px-6 py-2.5 rounded-2xl transition-all font-bold active:scale-95 border border-transparent"
                        >
                            Add
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full bg-[#f8fafc] hover:bg-[#38bdf8] text-[#0f172a] py-4 rounded-2xl text-[15px] font-extrabold shadow-lg shadow-[#f8fafc]/30 transition-all hover:-translate-y-1 active:scale-[0.98] border border-transparent"
                >
                    Save settings
                </button>

            </div>
        </div>
    )
}

export default Settings