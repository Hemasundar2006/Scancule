import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../components/Navbar'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [isError, setIsError] = useState(false)

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    setIsError(false)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        })
        if (error) throw error
        setMsg('Signup successful! Check your email for verification instructions (or log in if auto-verified).')
      }
    } catch (err) {
      console.error(err)
      setIsError(true)
      setMsg(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] text-slate-700 min-h-screen font-sans selection:bg-orange-100 selection:text-orange-900 flex flex-col items-center">
      <Navbar />
      
      <div className="flex-1 w-full flex flex-col justify-center items-center p-4 py-12">
        {/* SaaS Logo and branding header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          ScanCule
        </h1>
        <p className="text-slate-500 text-sm mt-2">Generate print-ready QR codes and backup logs directly to Google Sheets</p>
      </div>

      {/* Card Wrapper */}
      <div className="w-full max-w-md bg-white border border-slate-200/60 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
        <div className="flex border-b border-slate-100 mb-6">
          <button 
            className={`flex-1 pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${isLogin ? 'border-emerald-600 text-slate-900' : 'border-transparent text-slate-400'}`}
            onClick={() => { setIsLogin(true); setMsg(null); }}
          >
            Sign In
          </button>
          <button 
            className={`flex-1 pb-3 text-sm font-semibold tracking-wide border-b-2 transition-all ${!isLogin ? 'border-emerald-600 text-slate-900' : 'border-transparent text-slate-400'}`}
            onClick={() => { setIsLogin(false); setMsg(null); }}
          >
            Register
          </button>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl text-sm mb-4 border ${isError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {msg}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
              <input 
                type="text" 
                required 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe" 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 min-h-[44px] text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com" 
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 min-h-[44px] text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 min-h-[44px] text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 min-h-[44px] rounded-xl text-sm transition-all shadow-md shadow-emerald-600/10 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>


      </div>
      </div>
    </div>
  )
}
