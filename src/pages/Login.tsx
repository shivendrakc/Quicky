import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const Login = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setMessage('Check your email for the confirmation link!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f172a] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#38bdf8] opacity-5 blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-white opacity-5 blur-[100px]"></div>

      <div className="w-full max-w-md z-10">
        <div className="bg-[rgba(30,41,59,0.7)] backdrop-blur-xl border border-[#1e293b] p-8 sm:p-10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-[#f8fafc] tracking-tight mb-2">Quicky</h1>
            <p className="text-sm font-semibold text-[#f8fafc]/60">
              {isSignUp ? 'Create a new account' : 'Sign in to your account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5 flex flex-col">
            <div>
              <label className="block text-xs font-bold text-[#f8fafc]/80 uppercase tracking-wider mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0f172a]/60 border border-[#1e293b] focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/20 rounded-xl px-4 py-3 text-sm text-[#f8fafc] placeholder-[#f8fafc]/40 font-semibold transition-all outline-none"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[#f8fafc]/80 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0f172a]/60 border border-[#1e293b] focus:border-[#38bdf8] focus:ring-4 focus:ring-[#38bdf8]/20 rounded-xl px-4 py-3 text-sm text-[#f8fafc] placeholder-[#f8fafc]/40 font-semibold transition-all outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-900/20 border border-red-900/50">
                <p className="text-sm font-semibold text-red-400 text-center">{error}</p>
              </div>
            )}

            {message && (
              <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-900/50">
                <p className="text-sm font-semibold text-emerald-400 text-center">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#f8fafc] hover:bg-[#38bdf8] text-[#0f172a] shadow-lg shadow-[#f8fafc]/10 hover:shadow-[#38bdf8]/20 text-sm py-3.5 rounded-xl transition-all font-extrabold active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed border border-transparent flex justify-center items-center h-[52px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#0f172a] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                isSignUp ? 'Sign up' : 'Sign in'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
                setMessage(null)
              }}
              className="text-sm font-bold text-[#38bdf8] hover:text-[#f8fafc] transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
