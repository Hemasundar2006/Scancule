import React from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function Pricing() {
  const navigate = useNavigate()

  const plans = [
    {
      name: 'Free Trial',
      price: '0',
      duration: '7 days',
      limit: '10 barcodes',
      features: ['Basic product catalog', '1D Barcode with Numbers', 'Public scan product page', 'Email support'],
      popular: false,
    },
    {
      name: 'Basic',
      price: '299',
      duration: 'month',
      limit: '200 barcodes',
      features: ['Real-time Google Sheet sync', '1D Barcode & Numbers', 'Store Logo on Scan Page', 'Basic analytics dashboard'],
      popular: true,
    },
    {
      name: 'Pro',
      price: '799',
      duration: 'month',
      limit: '2,000 barcodes',
      features: ['Advanced scan geolocations', 'Bulk labels PDF export (3x7)', 'Store Location & Call Button', 'Priority WhatsApp support'],
      popular: false,
    },
    {
      name: 'Enterprise',
      price: '9,999',
      duration: 'year',
      limit: 'Unlimited barcodes',
      features: ['Multi-store management', 'Unlimited barcode generation', 'Dedicated sync tunnels', '24/7 dedicated account manager'],
      popular: false,
    }
  ]

  const comparisonRows = [
    { feature: 'Barcode Generation Limit', free: '10 items', basic: '200 items', pro: '2,000 items', enterprise: 'Unlimited' },
    { feature: '1D Barcode with Human Numbers', free: '✓ Included', basic: '✓ Included', pro: '✓ Included', enterprise: '✓ Included' },
    { feature: 'Live Google Sheets Auto-Sync', free: '—', basic: '✓ Real-time', pro: '✓ Real-time', enterprise: '✓ Real-time' },
    { feature: 'Bulk Printable PDF Sheets (A4 grid)', free: '—', basic: '—', pro: '✓ 21/page', enterprise: '✓ 21/page' },
    { feature: 'Public Customer Scan Page', free: 'Standard', basic: 'Branded', pro: 'Premium Partner', enterprise: 'VIP Partner' },
    { feature: 'Store Logo & Verified Badge', free: '—', basic: '✓ Included', pro: '✓ Included', enterprise: '✓ Included' },
    { feature: 'Store Address & Click-to-Call', free: '—', basic: 'Address Only', pro: '✓ Full Suite', enterprise: '✓ Full Suite' },
    { feature: 'Scan Analytics & Device Metrics', free: 'Basic count', basic: 'Devices & Totals', pro: 'Full Geo & Time', enterprise: 'Custom BI' },
    { feature: 'Support Level', free: 'Community', basic: 'Email (24h)', pro: 'WhatsApp Priority', enterprise: '24/7 Dedicated' },
  ]

  return (
    <div className="bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] text-slate-700 min-h-screen font-sans selection:bg-orange-100 selection:text-orange-900 scroll-smooth pb-16 flex flex-col items-center">
      <Navbar />
      
      <section className="w-full max-w-7xl px-6 pt-12 pb-16 relative">
        <div className="bg-white/80 border border-orange-100 p-8 md:p-12 rounded-[32px] shadow-xl shadow-orange-100/40 backdrop-blur-md">
          
          {/* Header */}
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-[#ff7640] uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
              SaaS Pricing & Plans
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mt-3 mb-4">
              Simple, Transparent Pricing for Any Store
            </h1>
            <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto">
              Compare our plans below. Start with a 7-day free trial or upgrade to unlock unlimited barcodes, Google Sheets sync, and bulk PDF label exports.
            </p>
          </div>

          {/* 1. Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-16">
            {plans.map((plan, idx) => (
              <div 
                key={idx} 
                className={`bg-white border rounded-3xl p-6 md:p-8 flex flex-col justify-between relative transition-all shadow-sm ${plan.popular ? 'border-[#ff7640] ring-2 ring-[#ff7640] shadow-xl shadow-orange-100/80 scale-105 z-10' : 'border-slate-200/80 hover:shadow-lg hover:border-orange-200'}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-[#ff7640] text-white text-[10px] md:text-xs uppercase font-bold tracking-widest px-4 py-1 rounded-full shadow-md">
                    Most Popular
                  </span>
                )}
                
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <div className="my-6 flex items-baseline">
                    <span className="text-4xl font-extrabold text-slate-900">Rs. {plan.price}</span>
                    <span className="text-slate-500 text-sm ml-2">/ {plan.duration}</span>
                  </div>
                  <span className="inline-block bg-orange-50 text-[#ff7640] text-xs px-3 py-1 rounded-lg font-semibold mb-6 border border-orange-100">
                    {plan.limit}
                  </span>
                  
                  <ul className="space-y-3.5 mb-8">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start space-x-2.5 text-xs md:text-sm text-slate-600">
                        <svg className="w-4 h-4 text-[#ff7640] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  onClick={() => navigate('/auth')}
                  className={`w-full font-bold py-3.5 px-4 rounded-xl text-xs md:text-sm transition-all cursor-pointer shadow-sm ${plan.popular ? 'bg-[#ff7640] hover:bg-[#e65c26] text-white shadow-orange-600/20' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'}`}
                >
                  Choose {plan.name}
                </button>
              </div>
            ))}
          </div>

          {/* 2. Side-by-Side Comparison Matrix */}
          <div className="mt-12 pt-12 border-t border-slate-200/80">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Detailed Feature Comparison</h2>
              <p className="text-xs text-slate-500 mt-1">See exact differences across each plan tier</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60">
                    <th className="py-3.5 px-4 font-bold text-slate-900 rounded-l-xl">Feature</th>
                    <th className="py-3.5 px-4 font-bold text-slate-700 text-center">Free Trial</th>
                    <th className="py-3.5 px-4 font-bold text-orange-600 text-center bg-orange-50/40">Basic</th>
                    <th className="py-3.5 px-4 font-bold text-slate-900 text-center">Pro</th>
                    <th className="py-3.5 px-4 font-bold text-slate-900 text-center rounded-r-xl">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800">{row.feature}</td>
                      <td className="py-3 px-4 text-center text-slate-500">{row.free}</td>
                      <td className="py-3 px-4 text-center font-bold text-orange-600 bg-orange-50/30">{row.basic}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-800">{row.pro}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      <footer className="border-t w-full max-w-7xl border-orange-100 bg-white/40 py-8 mt-auto text-center text-xs text-slate-500 rounded-t-3xl">
        <p>© {new Date().getFullYear()} ScanCule. All rights reserved.</p>
        <p className="mt-1">Modern shop inventory & barcode scanning platform.</p>
      </footer>
    </div>
  )
}
