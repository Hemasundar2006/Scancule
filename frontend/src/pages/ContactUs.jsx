import React, { useState } from 'react'
import Navbar from '../components/Navbar'

export default function ContactUs() {
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactSent, setContactSent] = useState(false)

  const handleContactSubmit = (e) => {
    e.preventDefault()
    setContactSent(true)
    setContactName('')
    setContactEmail('')
    setContactMessage('')
    setTimeout(() => {
      setContactSent(false)
    }, 5000)
  }

  return (
    <div className="bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] text-slate-700 min-h-screen font-sans selection:bg-orange-100 selection:text-orange-900 scroll-smooth pb-16 flex flex-col items-center">
      <Navbar />
      
      <section className="w-full max-w-7xl px-6 pt-12 pb-16 relative">
        <div className="bg-white/70 border border-orange-100 p-8 md:p-12 rounded-[28px] shadow-xl shadow-orange-100/30 backdrop-blur-md">
          <div className="text-center mb-16">
            <span className="text-xs font-bold text-[#ff7640] uppercase tracking-widest">Connect with Us</span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mt-2 mb-4">Get in Touch</h1>
            <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto">Have custom integration requests or need enterprise assistance? Shoot us a message.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Contact Details */}
            <div className="space-y-10 flex flex-col justify-center">
              <div>
                <h3 className="font-bold text-2xl text-slate-900 mb-4">ScanCule Offices</h3>
                <p className="text-slate-600 text-base leading-relaxed">
                  We are based in Bangalore, India, helping offline retail merchants connect their physical products to digital catalogs.
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4 text-slate-700">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100">
                    <svg className="w-5 h-5 text-[#ff7640]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <span className="text-base font-medium">+91 (80) 4123-5678</span>
                </div>
                
                <div className="flex items-center space-x-4 text-slate-700">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100">
                    <svg className="w-5 h-5 text-[#ff7640]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-base font-medium">support@scancule.com</span>
                </div>
                
                <div className="flex items-center space-x-4 text-slate-700">
                  <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center shrink-0 border border-orange-100">
                    <svg className="w-5 h-5 text-[#ff7640]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="text-base font-medium">72, Outer Ring Rd, Koramangala 4th Block, Bangalore, KA, India</span>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white border border-orange-100 rounded-3xl p-8 shadow-sm">
              {contactSent && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm mb-6 font-semibold flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Message sent! Our team will get back to you shortly.
                </div>
              )}
              
              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Name</label>
                  <input 
                    type="text" 
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="John Doe" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-h-[44px] text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff7640]/20 focus:border-[#ff7640] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="name@company.com" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-h-[44px] text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff7640]/20 focus:border-[#ff7640] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Message</label>
                  <textarea 
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="How can we help your business?" 
                    rows="5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-h-[44px] text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff7640]/20 focus:border-[#ff7640] transition-all resize-none"
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-[#ff7640] hover:bg-[#e65c26] text-white font-bold py-4 px-4 min-h-[44px] rounded-xl text-sm transition-all shadow-md shadow-orange-500/20 cursor-pointer mt-2"
                >
                  Send Message
                </button>
              </form>
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
