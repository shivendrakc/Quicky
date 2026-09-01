import { useState } from 'react'
import { EntryView } from './entry/EntryView'
import { AuditView } from './audit/AuditView'

type Tab = 'entry' | 'audit'

function App() {
  const [tab, setTab] = useState<Tab>('entry')

  return (
    <div className="app">
      <header className="app-header">
        <h1>Sales Order Logger</h1>
        <nav className="tabs">
          <button className={tab === 'entry' ? 'active' : ''} onClick={() => setTab('entry')}>
            Entry
          </button>
          <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>
            Audit
          </button>
        </nav>
      </header>
      <main className="app-main">{tab === 'entry' ? <EntryView /> : <AuditView />}</main>
    </div>
  )
}

export default App
