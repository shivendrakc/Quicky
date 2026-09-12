import { useState } from 'react'
import { CalendarHeatmap } from './CalendarHeatmap'
import { DrillDownView } from './DrillDownView'
import { RepDashboard } from './RepDashboard'
import { AdminSettings } from './AdminSettings'

type SubTab = 'calendar' | 'drilldown' | 'rep' | 'admin'

export function TrackerView() {
  const [subTab, setSubTab] = useState<SubTab>('calendar')

  return (
    <div>
      <nav className="subnav">
        <button className={subTab === 'calendar' ? 'active' : ''} onClick={() => setSubTab('calendar')}>
          Calendar
        </button>
        <button className={subTab === 'drilldown' ? 'active' : ''} onClick={() => setSubTab('drilldown')}>
          Drill-down
        </button>
        <button className={subTab === 'rep' ? 'active' : ''} onClick={() => setSubTab('rep')}>
          Rep dashboard
        </button>
        <button className={subTab === 'admin' ? 'active' : ''} onClick={() => setSubTab('admin')}>
          Admin
        </button>
      </nav>

      {subTab === 'calendar' && <CalendarHeatmap />}
      {subTab === 'drilldown' && <DrillDownView />}
      {subTab === 'rep' && <RepDashboard />}
      {subTab === 'admin' && <AdminSettings />}
    </div>
  )
}
