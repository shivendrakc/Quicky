import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, DollarSign, Calendar } from 'lucide-react';

interface Salesperson {
  id: string;
  name: string;
  workingDays: number;
}

export default function SalesTracker() {
  const [budget, setBudget] = useState<number>(100000);
  const [numSalespersons, setNumSalespersons] = useState<number>(3);
  const [salespersons, setSalespersons] = useState<Salesperson[]>([
    { id: '1', name: 'Alice', workingDays: 5 },
    { id: '2', name: 'Bob', workingDays: 4 },
    { id: '3', name: 'Charlie', workingDays: 5 },
  ]);

  // Handle number of salespersons change
  const handleNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNum = parseInt(e.target.value) || 0;
    setNumSalespersons(newNum);
    
    setSalespersons(prev => {
      const updated = [...prev];
      if (newNum > updated.length) {
        for (let i = updated.length; i < newNum; i++) {
          updated.push({ id: Math.random().toString(), name: `Salesperson ${i + 1}`, workingDays: 5 });
        }
      } else {
        updated.splice(newNum);
      }
      return updated;
    });
  };

  const updatePerson = (id: string, field: keyof Salesperson, value: any) => {
    setSalespersons(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const totalDays = useMemo(() => salespersons.reduce((sum, p) => sum + p.workingDays, 0), [salespersons]);

  return (
    <div className="min-h-[100svh] bg-[#0f172a] text-[#f8fafc] font-sans selection:bg-[#38bdf8]/50 text-left w-full max-w-[100vw]">
      {/* Navigation */}
      <nav className="border-b border-[#1e293b] p-6 flex justify-between items-center bg-[#1e293b]/10">
        <Link to="/" className="flex items-center gap-2 text-[#f8fafc] opacity-80 hover:opacity-100 transition-opacity font-medium">
          <ArrowLeft size={20} />
          <span>Back to Landing</span>
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-[#f8fafc]">LoungeLovers <span className="text-[#38bdf8]">Dashboard</span></h1>
        <div className="w-24"></div> {/* spacer */}
      </nav>

      <main className="max-w-6xl mx-auto p-8 pt-12">
        <header className="mb-10 text-left">
          <h2 className="text-3xl font-extrabold text-[#f8fafc] mb-2">Sales Allocation Target</h2>
          <p className="text-[#f8fafc]/80 text-lg font-medium">Distribute the store budget goals among the active floor personnel based on their shifts.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Controls Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#1e293b]/20 border border-[#1e293b] rounded-2xl p-6 shadow-md backdrop-blur-sm">
              <h3 className="text-xl font-bold text-[#f8fafc] mb-6 flex items-center gap-2">
                <DollarSign className="text-[#38bdf8]" strokeWidth={3} /> Store Settings
              </h3>
              
              <div className="space-y-4">
                <div className="text-left">
                  <label className="block text-sm font-bold text-[#f8fafc]/80 mb-2 uppercase tracking-wide">Total Monthly Budget ($)</label>
                  <input 
                    type="number" 
                    value={budget} 
                    onChange={e => setBudget(Number(e.target.value))}
                    className="w-full bg-[rgba(30,41,59,0.5)] border-2 border-[#1e293b] rounded-xl px-4 py-3 text-[#f8fafc] font-bold focus:outline-none focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/30 transition-all text-lg"
                  />
                </div>
                <div className="text-left">
                  <label className="block text-sm font-bold text-[#f8fafc]/80 mb-2 uppercase tracking-wide">Number of Salespersons</label>
                  <input 
                    type="number" 
                    min="1"
                    max="50"
                    value={numSalespersons} 
                    onChange={handleNumChange}
                    className="w-full bg-[rgba(30,41,59,0.5)] border-2 border-[#1e293b] rounded-xl px-4 py-3 text-[#f8fafc] font-bold focus:outline-none focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/30 transition-all text-lg"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-[#1e293b]/20 border border-[#1e293b] rounded-2xl p-6 shadow-md grid grid-cols-2 gap-4 text-center backdrop-blur-sm">
              <div className="p-4 bg-[rgba(30,41,59,0.5)] rounded-xl border border-[#1e293b]">
                <div className="text-sm font-bold text-[#f8fafc]/80 mb-1 uppercase tracking-wider text-[11px]">Total Shift Days</div>
                <div className="text-3xl font-extrabold text-[#f8fafc]">{totalDays}</div>
              </div>
              <div className="p-4 bg-[rgba(30,41,59,0.5)] rounded-xl border border-[#1e293b]">
                <div className="text-sm font-bold text-[#f8fafc]/80 mb-1 uppercase tracking-wider text-[11px]">Avg Target/Day</div>
                <div className="text-2xl font-extrabold text-[#f8fafc] shrink-0 mt-1">
                  ${totalDays > 0 ? (budget / totalDays).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
                </div>
              </div>
            </div>
          </div>

          {/* Configuration and Target Layout */}
          <div className="lg:col-span-2 bg-[#1e293b]/20 border border-[#1e293b] rounded-2xl shadow-lg overflow-hidden flex flex-col backdrop-blur-sm">
            <div className="p-6 border-b border-[#1e293b] flex justify-between items-center bg-[#1e293b]/30">
              <h3 className="text-xl font-bold text-[#f8fafc] flex items-center gap-2">
                <Users className="text-[#38bdf8]" strokeWidth={3} /> Sales Team Configuration
              </h3>
            </div>
            
            <div className="overflow-auto max-h-[600px] flex-1 bg-[rgba(30,41,59,0.5)]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#1e293b]/40 sticky top-0 z-10">
                  <tr>
                    <th className="py-4 px-6 text-xs font-bold text-[#f8fafc] uppercase tracking-widest border-b border-[#1e293b]">Employee Name</th>
                    <th className="py-4 px-6 text-xs font-bold text-[#f8fafc] uppercase tracking-widest w-40 text-center border-b border-[#1e293b]">Working Days</th>
                    <th className="py-4 px-6 text-xs font-bold text-[#f8fafc] uppercase tracking-widest text-right border-b border-[#1e293b]">Calculated Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  {salespersons.map((person) => {
                    const target = totalDays > 0 ? (budget / totalDays) * person.workingDays : 0;
                    return (
                      <tr key={person.id} className="hover:bg-[#1e293b]/10 transition-colors">
                        <td className="py-4 px-6">
                          <input 
                            type="text"
                            value={person.name}
                            onChange={(e) => updatePerson(person.id, 'name', e.target.value)}
                            className="bg-transparent border-b-2 border-transparent focus:border-[#38bdf8] text-[#f8fafc] w-full focus:outline-none font-bold text-lg placeholder-[#f8fafc]/40 transition-colors"
                            placeholder="Enter name"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-3">
                            <input 
                              type="number"
                              min="0"
                              max="31"
                              value={person.workingDays}
                              onChange={(e) => updatePerson(person.id, 'workingDays', Number(e.target.value))}
                              className="w-20 bg-[rgba(30,41,59,0.5)] border-2 border-[#1e293b] rounded-xl px-3 py-2 text-center font-bold text-[#f8fafc] focus:outline-none focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/30 transition-all"
                            />
                            <Calendar size={20} className="text-[#38bdf8]" />
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="text-xl font-bold text-[#f8fafc] bg-[rgba(30,41,59,0.5)] py-2 px-5 rounded-2xl border-2 border-[#38bdf8] whitespace-nowrap shadow-sm inline-block">
                            ${target.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {salespersons.length === 0 && (
               <div className="p-12 text-center text-[#f8fafc] font-medium">
                Please add salespersons to distribute the budget.
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
