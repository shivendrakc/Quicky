import { Link } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import '../App.css'

function LandingPage() {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <span className="landing-brand">Quicky</span>
        <Link to="/login" className="landing-login-btn">
          <LogIn size={16} />
          Login
        </Link>
      </nav>

      <main className="landing-hero">
        <h1 className="landing-motto">
          <span className="landing-motto-main">Visualize and optimise</span>
          <span className="landing-motto-sub">Sales Tracker one sale at a time.</span>
        </h1>
      </main>
    </div>
  )
}

export default LandingPage
