import { Link } from 'react-router-dom'
import '../App.css'

function LandingPage() {
  return (
    <div className="landing-container">

      <main className="hero-section">
        <h1 className="">Lounge Lovers</h1>
        <div className="hero-content">

          <div className="cta-buttons">
            <Link to="/dashboard" className="primary-btn inline-flex items-center justify-center no-underline">
              Sales Tracker
            </Link>
            <Link to="/dashboard/upload" className="secondary-btn inline-flex items-center justify-center no-underline">
              Quick Ship
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LandingPage
