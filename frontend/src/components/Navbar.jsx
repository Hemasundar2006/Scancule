import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()

  return (
    <nav className="flex justify-between items-center bg-white/60 border border-orange-100 rounded-full px-6 py-3 backdrop-blur-md z-10 shadow-sm max-w-7xl mx-auto w-full mt-6">
      {/* Sparkle Logo */}
      <Link to="/" className="flex items-center space-x-2 cursor-pointer text-[#ff7640]">
        <svg className="w-5 h-5 text-[#ff7640]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.246.588 1.81l-3.97 2.883a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.971-2.883a1 1 0 00-1.175 0l-3.97 2.883c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.97-2.883c-.773-.564-.373-1.81.588-1.81h4.906a1 1 0 00.95-.69l1.519-4.674z" />
        </svg>
        <span className="font-extrabold text-sm tracking-tight text-slate-800 uppercase">ScanCule</span>
      </Link>

      {/* Navigation Links */}
      <div className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-450">
        <Link to="/" className="hover:text-slate-800 transition-colors">Home</Link>
        <Link to="/about" className="hover:text-slate-800 transition-colors">About Us</Link>
        <Link to="/services" className="hover:text-slate-800 transition-colors">Services</Link>
        <Link to="/pricing" className="hover:text-slate-800 transition-colors">Pricing</Link>
        <Link to="/contact" className="hover:text-slate-800 transition-colors">Contact Us</Link>
      </div>

      {/* Pill Action Buttons */}
      <div className="flex items-center space-x-3">
        <button 
          onClick={() => navigate('/auth')}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
        >
          Request demo
        </button>
        <button 
          onClick={() => navigate('/auth')}
          className="text-xs font-bold bg-[#ff7640] hover:bg-[#e65c26] text-white px-4 py-2 rounded-full cursor-pointer transition-all shadow-md shadow-orange-500/10"
        >
          Sign in
        </button>
      </div>
    </nav>
  )
}
