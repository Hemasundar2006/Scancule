import React from 'react'
import Navbar from '../components/Navbar'

export default function Services() {
  return (
    <div className="bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] text-slate-700 min-h-screen font-sans selection:bg-orange-100 selection:text-orange-900 scroll-smooth pb-16 flex flex-col items-center">
      <Navbar />
      
      <section className="w-full max-w-7xl px-6 pt-12 pb-16 relative">
        <div className="bg-white/70 border border-orange-100 p-8 md:p-12 rounded-[28px] shadow-xl shadow-orange-100/30 backdrop-blur-md">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-[#ff7640] uppercase tracking-widest">Platform Services</span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mt-2 mb-4">What We Deliver to Shop Owners</h1>
            <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto">Complete set of tools to generate, backup, and trace physical scan interactions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Service 1 */}
            <div className="bg-white border border-orange-100 p-8 rounded-3xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#ff7640] flex items-center justify-center mb-6 border border-orange-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Sheets Auto-Sync</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Every insert, edit, or delete automatically updates your Google Sheet row. Sync details dynamically without API hassles.
              </p>
            </div>

            {/* Service 2 */}
            <div className="bg-white border border-orange-100 p-8 rounded-3xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#ff7640] flex items-center justify-center mb-6 border border-orange-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">QR & Barcode Service</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Generates beautiful high-resolution QR codes featuring custom logo overlays, along with 1D Code128 barcodes.
              </p>
            </div>

            {/* Service 3 */}
            <div className="bg-white border border-orange-100 p-8 rounded-3xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#ff7640] flex items-center justify-center mb-6 border border-orange-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Analytics Engine</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Log unique scans, device distributions, scan times, and geographical city metrics. Protect scan integrity with IP rate-limits.
              </p>
            </div>

            {/* Service 4 */}
            <div className="bg-white border border-orange-100 p-8 rounded-3xl shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#ff7640] flex items-center justify-center mb-6 border border-orange-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">Bulk Label Printer</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Select multiple products and export them as standard Avery label sticker sheet PDFs, ready for printing and packaging.
              </p>
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
