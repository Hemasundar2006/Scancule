import React, { useState } from 'react'
import Navbar from '../components/Navbar'

export default function LandingPage() {
  // Hero State Switch (1: Value Pitch, 2: Prompt Builder morph)
  const [heroState, setHeroState] = useState(1)
  
  // Interactive Prompt input state
  const [promptInput, setPromptInput] = useState('')
  const [selectedModel, setSelectedModel] = useState('ScanCule Engine v2')
  
  // Generated Mock Preview State
  const [generatedPreview, setGeneratedPreview] = useState(null)
  
  // Mouse position for hero cursor effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const templates = [
    { label: 'Generate retail price tags', desc: 'Create price, stock and barcode attributes.' },
    { label: 'Create restaurant menu items', desc: 'Setup dish info, pricing and ingredient list.' },
    { label: 'Build electronics catalog', desc: 'Add tech specifications, price and warranty details.' },
    { label: 'Bulk inventory barcodes', desc: 'Configure wholesale layouts and sync channels.' }
  ]

  // Pre-fills prompt and sets up interactive mock catalog preview
  const handleSelectTemplate = (label) => {
    setPromptInput(`Auto-generate a catalog configuration for: ${label}`)
    
    if (label.toLowerCase().includes('retail')) {
      setGeneratedPreview({
        shopName: 'ScanCule Retail Lab',
        prodName: 'Premium Leather Wallet',
        fields: [
          { label: 'Price', value: '1,499' },
          { label: 'Color', value: 'Classic Tan' },
          { label: 'Warranty', value: '1 Year Domestic' },
          { label: 'Stock Status', value: 'In Stock' }
        ]
      })
    } else if (label.toLowerCase().includes('restaurant')) {
      setGeneratedPreview({
        shopName: 'Gourmet Bistro',
        prodName: 'Truffle Mushroom Risotto',
        fields: [
          { label: 'Price', value: '450' },
          { label: 'Dietary', value: 'Vegetarian, Gluten-Free' },
          { label: 'Ingredients', value: 'Arborio Rice, Mushrooms, Truffle Oil' },
          { label: 'Prep Time', value: '15 Mins' }
        ]
      })
    } else if (label.toLowerCase().includes('electronics')) {
      setGeneratedPreview({
        shopName: 'ElectroHub',
        prodName: 'ScanCule Smart Band X',
        fields: [
          { label: 'Price', value: '2,999' },
          { label: 'Display', value: '1.43" AMOLED' },
          { label: 'Battery Life', value: 'Up to 14 Days' },
          { label: 'Waterproof', value: '5ATM Swimproof' }
        ]
      })
    } else {
      setGeneratedPreview({
        shopName: 'Wholesale Depot',
        prodName: 'Carbon Steel Bolts (Pack of 100)',
        fields: [
          { label: 'Bulk Price', value: '850' },
          { label: 'Material', value: 'Grade 8.8 Carbon Steel' },
          { label: 'Dimensions', value: 'M12 x 50mm' }
        ]
      })
    }
  }

  const handleSendPrompt = () => {
    if (!promptInput.trim()) return
    handleSelectTemplate(promptInput)
  }

  return (
    <div className="bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] text-slate-700 min-h-screen font-sans selection:bg-orange-100 selection:text-orange-900 scroll-smooth pb-16 flex flex-col items-center">
      <Navbar />
      
      {/* --------------------------------------------------------- */}
      {/* 1. HERO CASE FRAME PRESENTATION WRAPPER */}
      {/* --------------------------------------------------------- */}
      <section className="w-full max-w-7xl px-6 pt-12 pb-16 relative">
        {/* 24px ROUNDED HERO CONTAINER WITH SUBTLE LIGHT ORANGE BORDER */}
        <div 
          className="w-full border border-orange-100 bg-white/70 rounded-[28px] overflow-hidden relative shadow-xl shadow-orange-100/30 backdrop-blur-md min-h-[640px] flex flex-col justify-between p-6 md:p-8 group"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setMousePos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              isMoving: true
            })
          }}
          onMouseLeave={() => setMousePos((prev) => ({ ...prev, isMoving: false }))}
        >
          
          {/* Faint glowing hand SVG motif on lower-left */}
          <svg className="absolute bottom-0 left-0 w-80 h-80 opacity-20 pointer-events-none select-none" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 90 C30 85, 45 70, 50 55 C52 50, 50 40, 48 35 C46 30, 40 25, 45 20 C48 16, 55 20, 58 28 C60 32, 62 45, 68 46 C74 47, 85 40, 88 43 C91 46, 88 50, 82 55 C76 60, 70 70, 68 80 C66 90, 60 95, 55 100" stroke="url(#hand-glow)" strokeWidth="0.8" strokeLinecap="round"/>
            <circle cx="50" cy="55" r="1" fill="#ff7640"/>
            <circle cx="48" cy="35" r="1" fill="#ff7640"/>
            <circle cx="45" cy="20" r="1" fill="#ff7640"/>
            <circle cx="58" cy="28" r="1" fill="#ff7640"/>
            <circle cx="68" cy="46" r="1" fill="#ff7640"/>
            <line x1="50" y1="55" x2="48" y2="35" stroke="#ff7640" strokeWidth="0.2" strokeDasharray="1 1"/>
            <line x1="48" y1="35" x2="45" y2="20" stroke="#ff7640" strokeWidth="0.2" strokeDasharray="1 1"/>
            <defs>
              <linearGradient id="hand-glow" x1="0" y1="100" x2="100" y2="0">
                <stop offset="0%" stopColor="#FFDDB0" stopOpacity="0"/>
                <stop offset="50%" stopColor="#FFDDB0" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#ff7640" stopOpacity="0.8"/>
              </linearGradient>
            </defs>
          </svg>

          {/* Glowing warm radial light following cursor */}
          <div 
            className="absolute pointer-events-none select-none transition-all duration-75 ease-out rounded-full z-0"
            style={{
              width: '800px',
              height: '800px',
              background: 'radial-gradient(circle, rgba(255, 118, 64, 0.25) 0%, rgba(255, 221, 176, 0.15) 30%, rgba(255,255,255,0) 60%)',
              left: mousePos.isMoving ? mousePos.x : '50%',
              top: mousePos.isMoving ? mousePos.y : '100%',
              transform: 'translate(-50%, -50%)',
              filter: 'blur(30px)',
              opacity: mousePos.isMoving ? 1 : 0.6
            }}
          ></div>

          {/* DYNAMIC MORPHING HERO MAIN SECTION */}
          <div className="flex-1 flex flex-col justify-center items-center py-8 z-10 max-w-4xl mx-auto w-full text-center">
            
            {/* HERO STATE 1: CORE BRAND PITCH */}
            {heroState === 1 ? (
              <div className="space-y-8 animate-fade-in">
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-b from-slate-900 via-slate-800 to-slate-600 px-4">
                  The ultimate barcode <br /> & inventory platform.
                </h1>
                
                <p className="text-sm md:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
                  Empowering shop owners to instantly generate trackable barcodes, manage stock in real-time with Google Sheets, and provide customers with dynamic product details on every scan.
                </p>

                <div className="flex flex-col items-center space-y-3">
                  <button 
                    onClick={() => setHeroState(2)}
                    className="bg-[#0e1629] border border-cyan-950/60 hover:bg-[#121c35] text-slate-100 font-bold px-8 py-3.5 rounded-full text-sm transition-all shadow-lg hover:shadow-cyan-950/10 cursor-pointer flex items-center space-x-2 group animate-bounce"
                  >
                    <span>Start working now</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                  <span className="text-[10px] uppercase tracking-wider text-slate-455 font-bold">No code, no barriers.</span>
                </div>
              </div>
            ) : (
              
              /* HERO STATE 2: INTERACTIVE AI MOCK CONSOLE BUILDER */
              <div className="w-full space-y-6 animate-fade-in">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-850 px-4 transition-all">
                  What's on your catalog today?
                </h1>

                {/* Input Prompter Box */}
                <div className="w-full max-w-2xl mx-auto bg-white border border-orange-100 rounded-2xl p-4 shadow-md flex flex-col justify-between space-y-3">
                  <textarea 
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Describe a product catalog or paste details to auto-build QR attributes..."
                    rows="2"
                    className="w-full bg-transparent border-0 text-slate-800 placeholder-slate-450 text-xs focus:ring-0 focus:outline-none resize-none leading-relaxed"
                  />
                  
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center border-t border-orange-50 pt-2.5 gap-3 sm:gap-0">
                    <div className="flex items-center space-x-2">
                      <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer" title="Attach specs file">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </button>
                      
                      <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-bold text-slate-500 focus:outline-none"
                      >
                        <option value="ScanCule Engine v2">ScanCule Engine v2</option>
                        <option value="Google Sheet Sync v1.4">Google Sheet Sync v1.4</option>
                        <option value="Microservice Label PDF">Microservice Label PDF</option>
                      </select>
                    </div>

                    {/* Send Button */}
                    <button 
                      onClick={handleSendPrompt}
                      className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-white transition-colors shadow cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Templates Selector section */}
                {!generatedPreview && (
                  <div className="w-full max-w-3xl mx-auto space-y-3 text-left">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Select a template to build:</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {templates.map((tpl, index) => (
                        <button 
                          key={index}
                          onClick={() => handleSelectTemplate(tpl.label)}
                          className="bg-white hover:bg-[#fffcfb] border border-orange-100 hover:border-orange-250 p-4 rounded-xl text-left transition-all cursor-pointer shadow-sm group"
                        >
                          <span className="block text-slate-700 font-bold text-[11px] leading-tight mb-1 group-hover:text-[#ff7640] transition-colors">{tpl.label}</span>
                          <span className="block text-[9px] text-slate-450 leading-relaxed truncate">{tpl.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* INTERACTIVE PLAYGROUND MOCK PREVIEW CARD */}
                {generatedPreview && (
                  <div className="w-full max-w-sm mx-auto bg-white border border-[#ffe0d0] rounded-3xl p-5 shadow-xl relative animate-fade-in text-left">
                    {/* Mock Google Sheet Sync Indicator */}
                    <div className="absolute top-4 right-4 flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[8px] uppercase tracking-wider text-emerald-600 font-bold">Synced to Sheets</span>
                    </div>

                    {/* Mock Shop Title */}
                    <div className="flex items-center space-x-2.5 mb-4">
                      <div className="w-8 h-8 rounded-full bg-orange-50 text-[#ff7640] border border-orange-100 flex items-center justify-center font-bold text-sm">
                        {generatedPreview.shopName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 leading-none">{generatedPreview.shopName}</h4>
                        <span className="text-[8px] text-slate-400 uppercase tracking-wider mt-1 block font-semibold">Public Catalog Preview</span>
                      </div>
                    </div>

                    {/* Mock Fields */}
                    <div className="space-y-3.5 border-t border-orange-50 pt-3">
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Attribute parameters</p>
                      
                      <div className="grid grid-cols-2 gap-y-3">
                        <div className="col-span-1">
                          <span className="text-[8px] text-slate-400 block uppercase font-semibold">Name</span>
                          <span className="text-xs font-bold text-slate-700">{generatedPreview.prodName}</span>
                        </div>
                        
                        {/* Mini QR code mockup */}
                        <div className="col-span-1 justify-self-end self-start bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm row-span-3">
                          <svg className="w-11 h-11 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2 2h6v6H2V2zm2 2v2h2V4H4zm14-2h6v6h-6V2zm2 2v2h2V4h-2zM2 16h6v6H2v-6zm2 2v2h2v-2H4zm16-4h4v4h-4v-4zm-4 4h4v4h-4v-4zm4 2h4v4h-4v-4zm-4-6h4v4h-4v-4zm2 2h2v2h-2v-2z" />
                          </svg>
                        </div>

                        {generatedPreview.fields.map((f, fIdx) => (
                          <div key={fIdx} className="col-span-1">
                            <span className="text-[8px] text-slate-400 block uppercase font-semibold">{f.label}</span>
                            {f.label.toLowerCase() === 'price' || f.label.toLowerCase() === 'bulk price' ? (
                              <span className="text-sm font-extrabold text-[#ff7640]">Rs. {f.value}</span>
                            ) : (
                              <span className="text-xs font-medium text-slate-600">{f.value}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Back controls */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 pt-4">
                  <button 
                    onClick={() => { setPromptInput(''); setGeneratedPreview(null); }}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Clear Preview
                  </button>
                  <button 
                    onClick={() => { setHeroState(1); setGeneratedPreview(null); }}
                    className="text-[10px] text-slate-450 hover:text-slate-650 font-bold uppercase tracking-wider underline cursor-pointer"
                  >
                    ← Back to Pitch
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Micro Caption footer of inside container */}
          <div className="text-center pb-2 z-10">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ScanCule Interactive UI Console</span>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* HOW IT WORKS SECTION */}
      {/* --------------------------------------------------------- */}
      <section className="w-full max-w-7xl px-6 py-16 relative border-t border-orange-100">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-[#ff7640] uppercase tracking-widest">Simple Process</span>
          <h2 className="text-3xl font-extrabold text-slate-900 mt-2">How ScanCule Works</h2>
          <p className="text-slate-500 text-sm mt-2">Three simple steps to digitize your physical inventory.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-orange-100 via-orange-200 to-orange-100 z-0"></div>

          <div className="relative z-10 flex flex-col items-center text-center bg-white/60 p-6 rounded-3xl border border-orange-50 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#ff7640] text-white flex items-center justify-center text-2xl font-black mb-6 shadow-lg shadow-orange-500/20">1</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Create Catalog</h3>
            <p className="text-sm text-slate-500">Define custom attributes like price, color, or ingredients for your products in our intuitive dashboard.</p>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center bg-white/60 p-6 rounded-3xl border border-orange-50 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#ff7640] text-white flex items-center justify-center text-2xl font-black mb-6 shadow-lg shadow-orange-500/20">2</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Generate Codes</h3>
            <p className="text-sm text-slate-500">Instantly generate high-quality QR codes and printable barcodes tailored with your brand logo.</p>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center bg-white/60 p-6 rounded-3xl border border-orange-50 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#ff7640] text-white flex items-center justify-center text-2xl font-black mb-6 shadow-lg shadow-orange-500/20">3</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Scan & Sync</h3>
            <p className="text-sm text-slate-500">Customers scan to view details instantly. Every edit you make automatically syncs to your Google Sheet.</p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* WHY CHOOSE US SECTION */}
      {/* --------------------------------------------------------- */}
      <section className="w-full max-w-7xl px-6 py-20 relative bg-[#FFDDB0]/10 rounded-3xl mb-16 border border-orange-100 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold text-[#ff7640] uppercase tracking-widest">Why Choose ScanCule</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2 mb-6">Designed for Modern Retailers</h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              We eliminate the friction between physical shelves and digital information. Provide your customers with rich product pages instantly, without requiring them to download a single app.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-orange-50 text-[#ff7640] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-orange-100">✓</div>
                <div>
                  <p className="font-bold text-sm text-slate-800">No App Downloads</p>
                  <p className="text-xs text-slate-500">Frictionless scanning directly from native phone cameras.</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-orange-50 text-[#ff7640] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-orange-100">✓</div>
                <div>
                  <p className="font-bold text-sm text-slate-800">Dynamic Google Sheets Sync</p>
                  <p className="text-xs text-slate-500">Your data is yours. Export and modify inventory via Google Sheets in real time.</p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full bg-orange-50 text-[#ff7640] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold border border-orange-100">✓</div>
                <div>
                  <p className="font-bold text-sm text-slate-800">Deep Analytics</p>
                  <p className="text-xs text-slate-500">Track which products generate the most physical engagement from your customers.</p>
                </div>
              </li>
            </ul>
          </div>
          
          {/* Visual abstract representation */}
          <div className="relative h-80 bg-white border border-orange-100 rounded-[2rem] shadow-xl p-8 flex flex-col justify-center items-center overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 transform translate-x-1/2 -translate-y-1/2"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 transform -translate-x-1/2 translate-y-1/2"></div>
             
             <div className="relative z-10 w-full max-w-sm">
                <div className="bg-slate-900 rounded-2xl p-4 shadow-lg text-left transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  </div>
                  <p className="text-emerald-400 text-[10px] font-mono">1. Generating QR code for SK-920...</p>
                  <p className="text-slate-300 text-[10px] font-mono mt-1">2. Pushing attributes to Google Sheet...</p>
                  <p className="text-slate-300 text-[10px] font-mono mt-1">3. Live public URL ready: /p/SK-920</p>
                </div>
                
                <div className="absolute -bottom-12 -right-4 bg-white border border-slate-200 rounded-xl p-3 shadow-lg transform rotate-6 hover:rotate-0 transition-transform duration-300">
                   <div className="w-24 h-24 border-4 border-slate-900 rounded-lg p-1 bg-white">
                     <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-slate-900">
                        <path d="M2 2h6v6H2V2zm2 2v2h2V4H4zm14-2h6v6h-6V2zm2 2v2h2V4h-2zM2 16h6v6H2v-6zm2 2v2h2v-2H4zm16-4h4v4h-4v-4zm-4 4h4v4h-4v-4zm4 2h4v4h-4v-4zm-4-6h4v4h-4v-4zm2 2h2v2h-2v-2z" />
                     </svg>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* TESTIMONIALS SECTION (VERTICAL MARQUEE) */}
      {/* --------------------------------------------------------- */}
      <section className="w-full max-w-7xl px-6 py-16 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold text-[#ff7640] uppercase tracking-widest">Testimonials</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-2 mb-4">Trusted by modern shop owners</h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              See how retail, grocery, and electronics stores are transforming their physical inventory with ScanCule's digital magic.
            </p>
          </div>
          
          {/* Vertical Marquee Container */}
          <div className="h-[400px] overflow-hidden relative rounded-3xl border border-orange-100 bg-white/40 shadow-inner">
            {/* Gradient overlays for smooth fade */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#fffaf4] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#FFDDB0]/30 to-transparent z-10 pointer-events-none"></div>
            
            {/* Marquee Content */}
            <div className="flex flex-col animate-marquee-vertical space-y-4 px-4 pt-16 pb-4 w-full relative">
              {/* Duplicate the list to create a seamless infinite scroll loop */}
              {[1, 2].map((_, loopIdx) => (
                <React.Fragment key={loopIdx}>
                  <div className="bg-white border border-orange-50 rounded-2xl p-5 shadow-sm shrink-0">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex justify-center items-center font-bold text-orange-600">SJ</div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Sarah Jenkins</h4>
                        <p className="text-[10px] text-slate-500">Boutique Owner</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 italic">"ScanCule completely changed how I manage price tags. Customers love scanning to see material info and exact pricing instantly!"</p>
                  </div>
                  <div className="bg-white border border-orange-50 rounded-2xl p-5 shadow-sm shrink-0">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex justify-center items-center font-bold text-emerald-600">MR</div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Marcus Reed</h4>
                        <p className="text-[10px] text-slate-500">Tech Store Manager</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 italic">"The Google Sheets sync is a lifesaver. I update the sheet, and every QR code in my store reflects the new specifications immediately."</p>
                  </div>
                  <div className="bg-white border border-orange-50 rounded-2xl p-5 shadow-sm shrink-0">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex justify-center items-center font-bold text-blue-600">AL</div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Amanda Lee</h4>
                        <p className="text-[10px] text-slate-500">Cafe Founder</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 italic">"We use the QR codes on our tables for dietary info. No app required makes it so smooth for our guests."</p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* EXTENDED FOOTER */}
      {/* --------------------------------------------------------- */}
      <footer className="border-t w-full max-w-7xl border-orange-100 bg-white/60 pt-16 pb-8 mt-auto rounded-t-[3rem] px-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-black text-slate-900 mb-4">ScanCule</h3>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
              Empowering local shops and enterprises to bring their physical inventory to life through instant, seamless digital connections.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-4">Product</h4>
            <ul className="space-y-3 text-xs text-slate-500">
              <li><a href="#" className="hover:text-orange-600 transition-colors">Features</a></li>
              <li><a href="/pricing" className="hover:text-orange-600 transition-colors">Pricing</a></li>
              <li><a href="/services" className="hover:text-orange-600 transition-colors">Services</a></li>
              <li><a href="#" className="hover:text-orange-600 transition-colors">Integrations</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm mb-4">Company</h4>
            <ul className="space-y-3 text-xs text-slate-500">
              <li><a href="/about" className="hover:text-orange-600 transition-colors">About Us</a></li>
              <li><a href="/contact" className="hover:text-orange-600 transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-orange-600 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-orange-600 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-orange-100/50 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} ScanCule. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <div className="w-8 h-8 rounded-full bg-orange-50 flex justify-center items-center text-orange-400 hover:bg-orange-100 hover:text-orange-600 transition-colors cursor-pointer font-bold font-serif text-sm">X</div>
            <div className="w-8 h-8 rounded-full bg-orange-50 flex justify-center items-center text-orange-400 hover:bg-orange-100 hover:text-orange-600 transition-colors cursor-pointer font-bold text-xs">in</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
