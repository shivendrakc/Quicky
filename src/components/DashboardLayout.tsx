import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Upload, ListChecks, Settings, Home, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const getPageTitle = () => {
    if (currentPath === '/dashboard') return 'Sales Tracker';
    if (currentPath === '/dashboard/upload') return 'Stock File Upload';
    if (currentPath === '/dashboard/review') return 'Review Actions';
    if (currentPath === '/dashboard/settings') return 'Rule Settings';
    return 'Dashboard';
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--text)] overflow-hidden w-full font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[var(--border)] bg-[rgba(30,41,59,0.3)] backdrop-blur-md">
        <div className="p-6 border-b border-[var(--border)]">
          <NavLink to="/" className="flex items-center gap-3 no-underline group">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20 group-hover:scale-105 transition-transform">
              <Home className="text-[var(--bg)]" size={18} />
            </div>
            <span className="font-bold text-xl tracking-tight text-[var(--text-h)]">LoungeLovers</span>
          </NavLink>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col justify-between">
          <div className="space-y-8">
            <div>
              <div className="text-xs font-bold text-[var(--text)]/50 uppercase tracking-wider mb-3 px-3">Sales</div>
              <div className="space-y-1">
                <NavLink 
                  to="/dashboard" 
                  end
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${isActive ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--text)]/80 hover:bg-[var(--code-bg)] hover:text-[var(--text-h)]'}`}
                >
                  <LayoutDashboard size={18} />
                  <span>Sales Tracker</span>
                </NavLink>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-[var(--text)]/50 uppercase tracking-wider mb-3 px-3">Quick Ship Audit</div>
              <div className="space-y-1">
                <NavLink 
                  to="/dashboard/upload" 
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${isActive ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--text)]/80 hover:bg-[var(--code-bg)] hover:text-[var(--text-h)]'}`}
                >
                  <Upload size={18} />
                  <span>Upload Stock File</span>
                </NavLink>
                <NavLink 
                  to="/dashboard/review" 
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${isActive ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--text)]/80 hover:bg-[var(--code-bg)] hover:text-[var(--text-h)]'}`}
                >
                  <ListChecks size={18} />
                  <span>Review Actions</span>
                </NavLink>
                <NavLink 
                  to="/dashboard/settings" 
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${isActive ? 'bg-[var(--accent-bg)] text-[var(--accent)]' : 'text-[var(--text)]/80 hover:bg-[var(--code-bg)] hover:text-[var(--text-h)]'}`}
                >
                  <Settings size={18} />
                  <span>Rule Settings</span>
                </NavLink>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <button
               onClick={handleLogout}
               className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--bg)] selection:bg-[var(--accent)]/30">
        {/* Top Header Mobile */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-md z-10">
           <NavLink to="/" className="font-bold text-lg tracking-tight text-[var(--text-h)] flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--accent)] flex items-center justify-center">
              <Home className="text-[var(--bg)]" size={12} />
            </div>
            LoungeLovers
          </NavLink>
          <button onClick={handleLogout} className="text-red-400 hover:text-red-300">
            <LogOut size={20} />
          </button>
        </header>

        {/* Top Header Desktop (Subtle) */}
        <header className="hidden md:flex h-16 items-center px-8 border-b border-[var(--border)]/50 shrink-0">
          <h2 className="text-lg font-bold text-[var(--text-h)]">{getPageTitle()}</h2>
        </header>
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 w-full z-0 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
