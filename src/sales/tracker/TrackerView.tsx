import { useState } from 'react'
import { YearlyCalendar } from './YearlyCalendar'
import { DrillDownView } from './DrillDownView'
import { levelForDate, type Level } from './drillDownLevel'
import { Leaderboard } from './Leaderboard'
import { RepDashboard } from './RepDashboard'
import { AdminSettings } from './AdminSettings'
import { currentFyStartYear, fyDateRange, fyLabel } from './financialYear'

type SubTab = 'calendar' | 'drilldown' | 'leaderboard' | 'rep' | 'admin'

export function TrackerView() {
  const fyStartYear = currentFyStartYear()
  const [subTab, setSubTab] = useState<SubTab>('calendar')
  const [level, setLevel] = useState<Level>({ kind: 'fy' })
  const [range, setRange] = useState(() => ({ ...fyDateRange(fyStartYear), label: fyLabel(fyStartYear) }))
  const [selectedStaff, setSelectedStaff] = useState<string | undefined>(undefined)

  return (
    <div>
      <nav className="subnav">
        <button className={subTab === 'calendar' ? 'active' : ''} onClick={() => setSubTab('calendar')}>
          Calendar
        </button>
        <button className={subTab === 'drilldown' ? 'active' : ''} onClick={() => setSubTab('drilldown')}>
          Drill-down
        </button>
        <button className={subTab === 'leaderboard' ? 'active' : ''} onClick={() => setSubTab('leaderboard')}>
          Leaderboard
        </button>
        <button className={subTab === 'rep' ? 'active' : ''} onClick={() => setSubTab('rep')}>
          Rep dashboard
        </button>
        <button className={subTab === 'admin' ? 'active' : ''} onClick={() => setSubTab('admin')}>
          Targets & shifts
        </button>
      </nav>

      {subTab === 'calendar' && (
        <YearlyCalendar
          onSelectDay={(date) => {
            setLevel(levelForDate(date))
            setSubTab('drilldown')
          }}
        />
      )}
      {subTab === 'drilldown' && (
        <DrillDownView fyStartYear={fyStartYear} level={level} onLevelChange={setLevel} onRangeChange={setRange} />
      )}
      {subTab === 'leaderboard' && (
        <Leaderboard
          range={range}
          onSelectRep={(staff) => {
            setSelectedStaff(staff)
            setSubTab('rep')
          }}
        />
      )}
      {subTab === 'rep' && <RepDashboard initialStaff={selectedStaff} />}
      {subTab === 'admin' && <AdminSettings />}
    </div>
  )
}
