import { useState } from 'react'
import { Leaderboard } from './Leaderboard'
import { StatusFlagsPanel } from './StatusFlagsPanel'
import { OrderLog } from './OrderLog'
import { CategoryAdmin } from './CategoryAdmin'

type SubTab = 'leaderboard' | 'status' | 'log' | 'settings'

export function AuditView() {
  const [subTab, setSubTab] = useState<SubTab>('leaderboard')

  return (
    <div>
      <nav className="subnav">
        <button className={subTab === 'leaderboard' ? 'active' : ''} onClick={() => setSubTab('leaderboard')}>
          Leaderboard
        </button>
        <button className={subTab === 'status' ? 'active' : ''} onClick={() => setSubTab('status')}>
          Status flags
        </button>
        <button className={subTab === 'log' ? 'active' : ''} onClick={() => setSubTab('log')}>
          Full order log
        </button>
        <button className={subTab === 'settings' ? 'active' : ''} onClick={() => setSubTab('settings')}>
          Category settings
        </button>
      </nav>

      {subTab === 'leaderboard' && <Leaderboard />}
      {subTab === 'status' && <StatusFlagsPanel />}
      {subTab === 'log' && <OrderLog />}
      {subTab === 'settings' && <CategoryAdmin />}
    </div>
  )
}
