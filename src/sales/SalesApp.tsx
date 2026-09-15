import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EntryView } from './entry/EntryView'
import { ReviewQueue } from './review/ReviewQueue'
import { TrackerView } from './tracker/TrackerView'
import './sales.css'

type Tab = 'entry' | 'review' | 'tracker'

function SalesApp() {
  const [tab, setTab] = useState<Tab>('entry')

  return (
    <div className="sales-app">
      <header className="app-header">
        <Link to="/" className="app-home-link">
          ← QuickShip
        </Link>
        <h1>Sales Tracker</h1>
        <nav className="tabs">
          <button className={tab === 'entry' ? 'active' : ''} onClick={() => setTab('entry')}>
            Log Sale
          </button>
          <button className={tab === 'review' ? 'active' : ''} onClick={() => setTab('review')}>
            Review Queue
          </button>
          <button className={tab === 'tracker' ? 'active' : ''} onClick={() => setTab('tracker')}>
            Sales Tracker
          </button>
        </nav>
      </header>
      <main className="app-main">
        {tab === 'entry' && <EntryView />}
        {tab === 'review' && <ReviewQueue />}
        {tab === 'tracker' && <TrackerView />}
      </main>
    </div>
  )
}

export default SalesApp
