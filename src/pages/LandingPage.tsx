import { Link } from 'react-router-dom'
import { ArrowRight, LogIn, Package, TrendingUp } from 'lucide-react'
import furniture from '../assets/furniture.png'
import '../App.css'

function LandingPage() {
  return (
    <div className="landing-container">
      <nav className="w-full flex items-center justify-between px-6 md:px-12 py-6 max-w-6xl mx-auto">
        <span className="font-extrabold text-xl tracking-tight text-[var(--text-h)]">Quicky</span>
        <Link
          to="/login"
          className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]/70 hover:text-[var(--text-h)] transition-colors no-underline"
        >
          <LogIn size={16} />
          Sign in
        </Link>
      </nav>

      <main className="hero-section px-6">
        <div className="hero-content max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Fyshwick Furniture Ops</span>
          <h1>One workspace, two jobs done right</h1>
          <p className="text-lg text-[var(--text)]/70 max-w-xl">
            Quicky runs the floor: audit every stock shipment before it goes out, and track every sale against
            target so commissions calculate themselves. Pick a module below to get started.
          </p>
        </div>

        <img
          src={furniture}
          alt=""
          className="w-64 md:w-80 drop-shadow-2xl"
          style={{ animation: 'float 6s ease-in-out infinite' }}
        />
      </main>

      <section className="w-full max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-2 gap-6">
        <Link
          to="/dashboard/upload"
          className="group flex flex-col gap-4 p-8 rounded-[1.5rem] border border-[var(--border)] bg-[rgba(30,41,59,0.4)] backdrop-blur-md no-underline text-inherit transition-all hover:border-[var(--accent)] hover:bg-[rgba(30,41,59,0.6)]"
        >
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-bg)] flex items-center justify-center">
            <Package className="text-[var(--accent)]" size={22} />
          </div>
          <div>
            <h2 className="!mb-2 !text-2xl text-[var(--text-h)]">Quick Ship</h2>
            <p className="text-[var(--text)]/70 !mt-0">
              Upload stock files, review flagged actions, and audit shipments before they leave the warehouse.
            </p>
          </div>
          <span className="mt-auto flex items-center gap-2 font-bold text-[var(--accent)]">
            Open Quick Ship
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          to="/sales"
          className="group flex flex-col gap-4 p-8 rounded-[1.5rem] border border-[var(--border)] bg-[rgba(30,41,59,0.4)] backdrop-blur-md no-underline text-inherit transition-all hover:border-[var(--accent)] hover:bg-[rgba(30,41,59,0.6)]"
        >
          <div className="w-12 h-12 rounded-xl bg-[var(--accent-bg)] flex items-center justify-center">
            <TrendingUp className="text-[var(--accent)]" size={22} />
          </div>
          <div>
            <h2 className="!mb-2 !text-2xl text-[var(--text-h)]">Sales Tracker</h2>
            <p className="text-[var(--text)]/70 !mt-0">
              Log sales, watch the store's target fill up day by day, and see each rep's tier, commission, and
              Guardsman count update live.
            </p>
          </div>
          <span className="mt-auto flex items-center gap-2 font-bold text-[var(--accent)]">
            Open Sales Tracker
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </section>
    </div>
  )
}

export default LandingPage
