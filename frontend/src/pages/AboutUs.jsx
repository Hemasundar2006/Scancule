import React from 'react'
import Navbar from '../components/Navbar'

export default function AboutUs() {
  return (
    <div className="bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] text-slate-700 min-h-screen font-sans selection:bg-orange-100 selection:text-orange-900 scroll-smooth pb-16 flex flex-col items-center">
      <Navbar />
      
      <section className="w-full max-w-7xl px-6 pt-12 pb-16 relative">
        <div className="bg-white/70 border border-orange-100 p-8 md:p-12 rounded-[28px] shadow-xl shadow-orange-100/30 backdrop-blur-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold text-[#ff7640] uppercase tracking-widest">Our Mission</span>
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mt-2 mb-6 leading-tight">Bridging Physical Retail and Digital Simplicity</h1>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-4">
                At ScanCule, we believe that shop owners shouldn't need complicated inventory databases or expensive custom apps to share catalog details. We built a platform that turns a simple camera scan into a rich, interactive product web page.
              </p>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6">
                By syncing product details directly to your Google Sheets, we ensure you always own your data, with a secure, instant spreadsheet backup that you can take offline anytime.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-orange-100">
                <div>
                  <p className="text-2xl md:text-4xl font-black text-[#ff7640]">15K+</p>
                  <p className="text-[10px] md:text-xs text-slate-450 font-bold uppercase tracking-wider mt-1">Active Stores</p>
                </div>
                <div>
                  <p className="text-2xl md:text-4xl font-black text-[#ff7640]">5M+</p>
                  <p className="text-[10px] md:text-xs text-slate-450 font-bold uppercase tracking-wider mt-1">Codes Printed</p>
                </div>
                <div>
                  <p className="text-2xl md:text-4xl font-black text-[#ff7640]">99.9%</p>
                  <p className="text-[10px] md:text-xs text-slate-450 font-bold uppercase tracking-wider mt-1">Sync Uptime</p>
                </div>
              </div>
            </div>
            
            <div className="bg-[#FFDDB0]/20 border border-orange-100 p-8 rounded-3xl relative h-full flex flex-col justify-center">
              <h3 className="font-bold text-xl text-slate-800 mb-6">Why Merchants Trust ScanCule</h3>
              <ul className="space-y-6">
                <li className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-white text-[#ff7640] flex items-center justify-center shrink-0 shadow-sm font-bold border border-orange-100">✓</div>
                  <div>
                    <p className="font-bold text-base text-slate-800">No App Installs Required</p>
                    <p className="text-sm text-slate-500 mt-1">Customers scan with their phone camera and read info directly in the browser.</p>
                  </div>
                </li>
                <li className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-white text-[#ff7640] flex items-center justify-center shrink-0 shadow-sm font-bold border border-orange-100">✓</div>
                  <div>
                    <p className="font-bold text-base text-slate-800">Dynamic Custom Fields</p>
                    <p className="text-sm text-slate-500 mt-1">Fully customize parameters per product catalog (Price, Ingredients, Batch, Warranty).</p>
                  </div>
                </li>
                <li className="flex items-start space-x-4">
                  <div className="w-8 h-8 rounded-full bg-white text-[#ff7640] flex items-center justify-center shrink-0 shadow-sm font-bold border border-orange-100">✓</div>
                  <div>
                    <p className="font-bold text-base text-slate-800">Offline-Ready Sync</p>
                    <p className="text-sm text-slate-500 mt-1">Your connected Google Sheet serves as a backup, spreadsheet export, and offline record list.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t w-full max-w-7xl border-orange-100 bg-white/40 py-8 mt-auto text-center text-xs text-slate-500 rounded-t-3xl">
        <p>© {new Date().getFullYear()} ScanCule. All rights reserved.</p>
        <p className="mt-1">Modern shop inventory tools.</p>
      </footer>
    </div>
  )
}
