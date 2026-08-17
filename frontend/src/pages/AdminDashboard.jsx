import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAppStore } from '../lib/store'

export default function AdminDashboard() {
  const { logout } = useAppStore()
  const [activeTab, setActiveTab] = useState('billing-queue')
  const [subscriptions, setSubscriptions] = useState([])
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  
  const [paymentSettingsId, setPaymentSettingsId] = useState(null)
  const [upiId, setUpiId] = useState('')
  const [bankDetails, setBankDetails] = useState('')
  const [settingsLoading, setSettingsLoading] = useState(false)
  
  useEffect(() => {
    loadBillingQueue()
    loadShops()
    loadPaymentSettings()
  }, [])

  const loadBillingQueue = async () => {
    setLoading(true)
    try {
      // 1. Fetch subscriptions with plans & shops
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          shop_id,
          plan_id,
          transaction_ref,
          payment_proof_url,
          created_at,
          status,
          plans (name, duration_days, price),
          shops (id, shop_name, owner_id)
        `)
        .order('created_at', { ascending: false })

      if (subError) {
        console.warn('Subscriptions fetch error:', subError)
      }

      // 2. Fetch profiles to match owner_id
      const { data: profData } = await supabase.from('profiles').select('id, email, full_name')
      const profileMap = (profData || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {})

      const mergedSubs = (subData || []).map(s => ({
        ...s,
        shops: s.shops ? {
          ...s.shops,
          profiles: profileMap[s.shops.owner_id] || { email: 'User Account' }
        } : null
      }))

      setSubscriptions(mergedSubs)
    } catch (err) {
      console.error('Error in loadBillingQueue:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadShops = async () => {
    try {
      const { data: shopsData, error } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const { data: profData } = await supabase.from('profiles').select('id, email, full_name')
      const profileMap = (profData || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {})

      const mergedShops = (shopsData || []).map(s => ({
        ...s,
        profiles: profileMap[s.owner_id] || { full_name: 'Shop Owner', email: 'N/A' }
      }))

      setShops(mergedShops)
    } catch (err) {
      console.error('Error loading shops in admin:', err)
    }
  }

  const loadPaymentSettings = async () => {
    try {
      const { data } = await supabase.from('payment_settings').select('*').limit(1).maybeSingle()
      if (data) {
        setPaymentSettingsId(data.id)
        setUpiId(data.upi_id || '')
        setBankDetails(data.bank_details || '')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveSystemSettings = async (e) => {
    e.preventDefault()
    setSettingsLoading(true)
    setMsg(null)
    try {
      if (paymentSettingsId) {
        const { error } = await supabase.from('payment_settings').update({
          upi_id: upiId,
          bank_details: bankDetails
        }).eq('id', paymentSettingsId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('payment_settings').insert({
          upi_id: upiId,
          bank_details: bankDetails
        }).select().single()
        if (error) throw error
        setPaymentSettingsId(data.id)
      }
      setMsg('System settings updated successfully.')
    } catch (err) {
      console.error(err)
      alert('Failed to update settings.')
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleApproveSubscription = async (subId, shopId, durationDays = 30) => {
    try {
      const now = new Date()
      const end = new Date(Date.now() + (durationDays || 30) * 24 * 60 * 60 * 1000)

      // Update subscription to active
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString()
        })
        .eq('id', subId)

      if (subError) {
        // Fallback update to just status if date columns are not in schema
        const { error: fallbackError } = await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('id', subId)
        if (fallbackError) throw fallbackError
      }

      await supabase
        .from('shops')
        .update({ status: 'active' })
        .eq('id', shopId)

      setMsg('Subscription approved and activated successfully!')
      loadBillingQueue()
      loadShops()
    } catch (err) {
      console.error(err)
      alert('Approval failed: ' + (err.message || 'Error approving subscription.'))
    }
  }

  const handleRejectSubscription = async (subId) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'rejected' })
        .eq('id', subId)

      if (error) throw error
      setMsg('Subscription request rejected.')
      loadBillingQueue()
    } catch (err) {
      console.error(err)
      alert('Rejection failed: ' + (err.message || 'Error rejecting subscription.'))
    }
  }

  const handleToggleShopStatus = async (shopId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active'
    try {
      const { error } = await supabase
        .from('shops')
        .update({ status: nextStatus })
        .eq('id', shopId)

      if (error) throw error
      loadShops()
    } catch (err) {
      console.error(err)
      alert('Failed to update shop status.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] text-slate-800 flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Admin Header */}
      <header className="border-b border-slate-200/60 bg-white px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold uppercase tracking-widest bg-red-50 text-red-650 border border-red-200 px-2 py-0.5 rounded-md">Admin</span>
          <span className="font-extrabold text-sm text-slate-900">Platform Control</span>
        </div>
        <button 
          onClick={logout}
          className="text-xs bg-white hover:bg-slate-50 border border-slate-250 text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          Sign Out
        </button>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col md:flex-row gap-6">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 flex flex-row md:flex-col gap-2 md:gap-1.5 shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory hide-scrollbar">
          <button 
            onClick={() => setActiveTab('billing-queue')}
            className={`shrink-0 md:w-full text-left px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all cursor-pointer snap-start whitespace-nowrap ${activeTab === 'billing-queue' ? 'bg-white text-orange-700 shadow-sm border border-slate-200/60' : 'hover:bg-slate-100/50 text-slate-500'}`}
          >
            💳 Billing Approval Queue
          </button>
          
          <button 
            onClick={() => setActiveTab('all-shops')}
            className={`shrink-0 md:w-full text-left px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all cursor-pointer snap-start whitespace-nowrap ${activeTab === 'all-shops' ? 'bg-white text-orange-700 shadow-sm border border-slate-200/60' : 'hover:bg-slate-100/50 text-slate-500'}`}
          >
            🏪 Shop Accounts Registry
          </button>

          <button 
            onClick={() => setActiveTab('system-settings')}
            className={`shrink-0 md:w-full text-left px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all cursor-pointer snap-start whitespace-nowrap ${activeTab === 'system-settings' ? 'bg-white text-orange-700 shadow-sm border border-slate-200/60' : 'hover:bg-slate-100/50 text-slate-500'}`}
          >
            ⚙️ System Settings
          </button>
        </aside>

        {/* Content Container */}
        <main className="flex-1 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
          {msg && (
            <div className="p-4 bg-orange-50 border border-orange-200 text-orange-700 text-sm rounded-2xl mb-6">
              {msg}
            </div>
          )}

          {activeTab === 'billing-queue' && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Manual Payment Approvals Queue</h2>
              {loading ? (
                <p className="text-slate-500 text-sm">Loading billing queue...</p>
              ) : subscriptions.length === 0 ? (
                <p className="text-slate-500 text-sm py-8 text-center">No payment submissions found.</p>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800">{sub.shops?.shop_name}</span>
                          <span className="text-slate-400 text-xs">({sub.shops?.profiles?.email})</span>
                        </div>
                        <p className="text-xs text-slate-650">
                          Selected Plan: <span className="font-semibold text-orange-600">{sub.plans?.name}</span> (Rs. {sub.plans?.price})
                        </p>
                        <p className="text-xs text-slate-650">
                          UTR / Reference ID: <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-amber-700">{sub.transaction_ref || 'None'}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Submitted: {new Date(sub.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Payment Image Proof Display */}
                      {sub.payment_proof_url && (
                        <div className="shrink-0">
                          <a 
                            href={sub.payment_proof_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block text-xs bg-white hover:bg-slate-50 border border-slate-250 text-slate-600 px-3 py-2 rounded-xl transition-all shadow-sm font-semibold"
                          >
                            📷 View Receipt Proof
                          </a>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 md:self-center">
                        {sub.status === 'pending' ? (
                          <>
                            <button 
                              onClick={() => handleApproveSubscription(sub.id, sub.shops.id, sub.plans?.duration_days)}
                              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleRejectSubscription(sub.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs font-bold capitalize px-3 py-1 rounded-full ${sub.status === 'active' ? 'bg-orange-50 text-orange-700 border border-orange-200' : sub.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                            {sub.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'all-shops' && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Shops Accounts Registry</h2>
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Shop Name</th>
                      <th className="px-4 py-3">Owner Contact</th>
                      <th className="px-4 py-3">Connected Sheet</th>
                      <th className="px-4 py-3">Account Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shops.map((shop) => (
                      <tr key={shop.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 font-bold text-slate-800">{shop.shop_name}</td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-slate-755 font-semibold">{shop.profiles?.full_name || 'N/A'}</p>
                          <p className="text-[10px] text-slate-400">{shop.profiles?.email}</p>
                        </td>
                        <td className="px-4 py-4 max-w-[150px] truncate">
                          {shop.google_sheet_id ? (
                            <span className="font-mono text-xs bg-slate-50 border border-slate-150 px-2 py-0.5 rounded text-teal-700" title={shop.google_sheet_id}>
                              {shop.google_sheet_id.slice(0, 10)}...
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Disconnected</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${shop.status === 'active' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {shop.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button 
                            onClick={() => handleToggleShopStatus(shop.id, shop.status)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm ${shop.status === 'active' ? 'bg-red-50 hover:bg-red-100 text-red-650 border border-red-200' : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'}`}
                          >
                            {shop.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'system-settings' && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6">Global System Settings</h2>
              
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Payment & Billing Instructions</h3>
                <p className="text-xs text-slate-500 mb-6">
                  These details will be shown to shop owners when they request a plan upgrade via bank transfer or UPI.
                </p>
                <form onSubmit={handleSaveSystemSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Platform UPI ID</label>
                    <input 
                      type="text" 
                      required 
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. admin@upi"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Bank Account Details</label>
                    <textarea 
                      required
                      value={bankDetails}
                      onChange={(e) => setBankDetails(e.target.value)}
                      placeholder="Bank Name: State Bank of India&#10;Account Name: ScanCule LLC&#10;Account No: 00000000000&#10;IFSC: SBIN0000000"
                      rows="4"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-600 transition-colors resize-none"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={settingsLoading}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-orange-600/10 cursor-pointer disabled:opacity-50 mt-4"
                  >
                    {settingsLoading ? 'Saving Settings...' : 'Update System Settings'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
