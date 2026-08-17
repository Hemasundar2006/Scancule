import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAppStore } from '../lib/store'
import Navbar from '../components/Navbar'
import { useNavigate } from 'react-router-dom'

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const { user, setShop, setActivePage } = useAppStore()
  
  const [shopName, setShopName] = useState('')
  const [category, setCategory] = useState('Retail')
  const [address, setAddress] = useState('')
  const [contact, setContact] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  
  // Sheet config
  const [sheetId, setSheetId] = useState('')
  const [googleRefreshToken, setGoogleRefreshToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  
  useEffect(() => {
    async function checkOAuthSession() {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (!error && session) {
        if (session.provider_refresh_token) {
          setGoogleRefreshToken(session.provider_refresh_token)
        }
      }
    }
    checkOAuthSession()
  }, [])

  const extractSheetId = (input) => {
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : input.trim()
  }

  const handleRegisterShop = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const finalSheetId = extractSheetId(sheetId)
      if (!shopName.trim()) {
        throw new Error('Shop Name is mandatory.')
      }

      const { data, error } = await supabase
        .from('shops')
        .insert({
          owner_id: user.id,
          shop_name: shopName,
          shop_category: category,
          address: address || null,
          contact_number: contact || null,
          logo_url: logoUrl || null,
          google_sheet_id: finalSheetId || null,
          google_refresh_token: googleRefreshToken || null
        })
        .select()
        .single()

      if (error) throw error

      setShop(data)
      
      const { data: plans } = await supabase.from('plans').select('id').eq('name', 'Free Trial').single()
      if (plans) {
        await supabase.from('subscriptions').insert({
          shop_id: data.id,
          plan_id: plans.id,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      }

      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Failed to complete store configuration.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] text-slate-700 min-h-screen font-sans selection:bg-orange-100 selection:text-orange-900 flex flex-col items-center">
      <Navbar />
      
      <div className="flex-1 w-full flex flex-col justify-center items-center p-4 py-12">
        <div className="w-full max-w-lg bg-white border border-slate-200/60 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Configure Your Store</h1>
        <p className="text-slate-500 text-sm mb-6">Complete these details to activate your ScanCule platform dashboard.</p>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegisterShop} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Shop Name *</label>
              <input 
                type="text" 
                required 
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="My Store LLC" 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Store Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-emerald-600 transition-colors"
              >
                <option value="Retail">Retail Store</option>
                <option value="Grocery">Grocery / Supermarket</option>
                <option value="Clothing">Clothing & Apparel</option>
                <option value="Restaurant">Restaurant & Cafe</option>
                <option value="Electronics">Consumer Electronics</option>
                <option value="Other">Other Category</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Contact Number</label>
            <input 
              type="text" 
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="+1 (555) 019-2834" 
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Physical Address</label>
            <textarea 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Shopping Mall Lane, Suite A" 
              rows="2"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Logo URL (Optional)</label>
            <input 
              type="url" 
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://mywebsite.com/logo.png" 
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
            />
          </div>

          <div className="border-t border-slate-100 pt-5 mt-5">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Google Sheets Auto-Sync Setup</h3>
            <p className="text-slate-500 text-xs leading-relaxed mb-4">
              To auto-sync products, create a Google Sheet, copy its full URL (or its spreadsheet ID), and paste it below. 
              Ensure you logged in with Google so we have sync permissions.
            </p>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Google Sheet URL or ID</label>
              <input 
                type="text" 
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit" 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition-colors"
              />
            </div>
            {googleRefreshToken ? (
              <span className="inline-block text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full mt-2 font-medium">
                ✓ Google account connected successfully
              </span>
            ) : (
              <span className="inline-block text-[10px] text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full mt-2 font-medium">
                ⚠ Google account not connected (sync will work if sheet is shared publicly or you reconnect with Google)
              </span>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/10 cursor-pointer disabled:opacity-50 mt-4"
          >
            {loading ? 'Initializing Store...' : 'Complete Configuration & Launch'}
          </button>
        </form>
      </div>
      </div>
    </div>
  )
}
