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
            <div className="max-w-xl w-full mx-auto bg-[rgba(58,42,29,0.5)] backdrop-blur-xl border-2 border-[#3a2a1d]/60 rounded-[2rem] p-6 sm:p-10 shadow-[0_8px_32px_rgba(94,58,27,0.25)]">

                <h1 className="text-3xl font-extrabold text-[#f6ecdd] mb-2 tracking-tight">Settings</h1>
                <p className="text-sm font-medium text-[#f6ecdd]/80 mb-8">Configure thresholds and classification rules</p>

                {/* Thresholds */}
                <div className="bg-[rgba(58,42,29,0.5)] backdrop-blur-md border border-[#3a2a1d]/60 rounded-3xl p-6 mb-5 shadow-sm">
                    <h2 className="text-[11px] font-bold text-[#f6ecdd] mb-4 uppercase tracking-widest opacity-80">Stock thresholds</h2>

                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <p className="text-sm font-bold text-[#f6ecdd]">Normal item threshold</p>
                            <p className="text-xs font-semibold text-[#f6ecdd]/70 mt-1">At or above this is quick ship</p>
                        </div>
                        <input
                            type="number"
                            value={normalThreshold}
                            onChange={e => setNormalThreshold(Number(e.target.value))}
                            className="w-20 bg-[rgba(58,42,29,0.5)] border border-[#3a2a1d] focus:border-[#d98b4f] focus:outline-none focus:ring-4 focus:ring-[#d98b4f]/30 rounded-2xl px-3 py-2 text-sm text-center text-[#f6ecdd] font-bold transition-all"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-[#f6ecdd]">Dining chair threshold</p>
                            <p className="text-xs font-semibold text-[#f6ecdd]/70 mt-1">Separate threshold for chairs</p>
                        </div>
                        <input
                            type="number"
                            value={chairThreshold}
                            onChange={e => setChairThreshold(Number(e.target.value))}
                            className="w-20 bg-[rgba(58,42,29,0.5)] border border-[#3a2a1d] focus:border-[#d98b4f] focus:outline-none focus:ring-4 focus:ring-[#d98b4f]/30 rounded-2xl px-3 py-2 text-sm text-center text-[#f6ecdd] font-bold transition-all"
                        />
                    </div>
                </div>

                {/* Keywords */}
                <div className="bg-[rgba(58,42,29,0.5)] backdrop-blur-md border border-[#3a2a1d]/60 rounded-3xl p-6 mb-8 shadow-sm">
                    <h2 className="text-[11px] font-bold text-[#f6ecdd] mb-4 uppercase tracking-widest opacity-80">Classification keywords</h2>
                    <p className="text-xs font-semibold text-[#f6ecdd]/80 mb-4">Products matching these words are classified as dining chairs</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {keywords.map((kw, i) => (
                            <span key={i} className="flex items-center gap-1.5 bg-[rgba(58,42,29,0.5)] border border-[#3a2a1d]/50 shadow-sm text-[#f6ecdd] font-bold text-xs px-3 py-1.5 rounded-2xl">
                                {kw}
                                <button onClick={() => removeKeyword(i)} className="text-[#f6ecdd]/60 hover:text-[#d98b4f] transition-colors">✕</button>
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
                            className="flex-1 bg-[rgba(58,42,29,0.5)] border border-[#3a2a1d] focus:border-[#d98b4f] focus:outline-none focus:ring-4 focus:ring-[#d98b4f]/30 rounded-2xl px-4 py-2.5 text-sm text-[#f6ecdd] placeholder-[#f6ecdd]/50 font-bold transition-all"
                        />
                        <button
                            onClick={addKeyword}
                            className="bg-[#f6ecdd] hover:bg-[#d98b4f] text-[#1c140d] shadow-md shadow-[#f6ecdd]/30 text-sm px-6 py-2.5 rounded-2xl transition-all font-bold active:scale-95 border border-transparent"
                        >
                            Add
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full bg-[#f6ecdd] hover:bg-[#d98b4f] text-[#1c140d] py-4 rounded-2xl text-[15px] font-extrabold shadow-lg shadow-[#f6ecdd]/30 transition-all hover:-translate-y-1 active:scale-[0.98] border border-transparent"
                >
                    Save settings
                </button>

            </div>
        </div>
    )
}

export default Settings