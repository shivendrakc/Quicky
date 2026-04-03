import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SalesTracker from './pages/SalesTracker'
import Settings from './pages/Settings'
import Upload from './pages/upload'
import Review from './pages/Review'
import DashboardLayout from './components/DashboardLayout'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<SalesTracker />} />
          <Route path="upload" element={<Upload />} />
          <Route path="review" element={<Review />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Legacy redirects */}
        <Route path="/tracker" element={<Navigate to="/dashboard" replace />} />
        <Route path="/quick-ship" element={<Navigate to="/dashboard/upload" replace />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
