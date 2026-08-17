import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function PublicScanPage() {
  const { code } = useParams()
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadProductAndLogScan() {
      try {
        setLoading(true)
        
        // 1. Try RPC function first
        let prodInfo = null
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_public_product', { p_unique_code: code })

        if (!rpcError && rpcData && rpcData.length > 0) {
          prodInfo = rpcData[0]
        } else {
          // 2. Direct fallback table query
          const { data: tableData, error: tableError } = await supabase
            .from('products')
            .select(`
              id,
              unique_code,
              custom_fields,
              public_fields,
              barcode_url,
              shops (
                id,
                shop_name,
                shop_category,
                logo_url,
                address,
                contact_number
              )
            `)
            .eq('unique_code', code)
            .maybeSingle()

          if (tableError) throw tableError

          if (tableData) {
            prodInfo = {
              product_id: tableData.id,
              unique_code: tableData.unique_code,
              custom_fields: tableData.custom_fields,
              public_fields: tableData.public_fields,
              barcode_url: tableData.barcode_url,
              shop_name: tableData.shops?.shop_name || 'Verified Merchant',
              shop_category: tableData.shops?.shop_category || 'Retail Store',
              logo_url: tableData.shops?.logo_url,
              address: tableData.shops?.address,
              contact_number: tableData.shops?.contact_number,
              plan_name: 'Pro'
            }
          }
        }

        if (!prodInfo) {
          setError('This barcode does not match any registered item in our catalog.')
          setLoading(false)
          return
        }

        setProduct(prodInfo)
        setLoading(false)

        // 3. Log Scan Interaction directly into scan_logs
        try {
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
          const isTablet = /iPad|Tablet/i.test(navigator.userAgent)
          const deviceType = isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'

          await supabase.from('scan_logs').insert({
            product_id: prodInfo.product_id,
            device_type: deviceType,
            city: 'Online Scan',
            user_agent: navigator.userAgent
          })
        } catch (logErr) {
          console.warn('Scan log interaction non-fatal error:', logErr)
        }

      } catch (err) {
        console.error('Scan page error:', err)
        setError(err.message || 'An error occurred while loading product details.')
        setLoading(false)
      }
    }

    if (code) {
      loadProductAndLogScan()
    }
  }, [code])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product?.shop_name} - ${getProductName()}`,
          text: `Check out ${getProductName()} from ${product?.shop_name}!`,
          url: window.location.href,
        })
      } catch (e) {
        // Ignored if cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const getFields = () => {
    if (!product) return []
    if (product.custom_fields && product.custom_fields.length > 0) return product.custom_fields
    if (product.public_fields && product.public_fields.length > 0) return product.public_fields
    return []
  }

  const getProductName = () => {
    const fields = getFields()
    const nameField = fields.find(f => f.label?.toLowerCase() === 'name')
    return nameField ? nameField.value : 'Catalog Item'
  }

  const getProductPrice = () => {
    const fields = getFields()
    const priceField = fields.find(f => f.label?.toLowerCase() === 'price' || f.label?.toLowerCase() === 'amount')
    return priceField ? priceField.value : null
  }

  const getOtherFields = () => {
    const fields = getFields()
    return fields.filter(f => f.label?.toLowerCase() !== 'name' && f.label?.toLowerCase() !== 'price')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] text-slate-800 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-white shadow-xl shadow-orange-100 flex items-center justify-center mb-6 animate-bounce">
          <div className="w-8 h-8 rounded-full border-3 border-orange-500 border-t-transparent animate-spin"></div>
        </div>
        <h2 className="text-base font-bold text-slate-800 mb-1">Authenticating Barcode</h2>
        <p className="text-slate-500 text-xs tracking-wide">Retrieving verified merchant catalog details...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] text-slate-800 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white border border-red-100 p-8 rounded-3xl max-w-sm shadow-xl shadow-red-50/50">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
            ⚠️
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-2">Item Not Found</h2>
          <p className="text-slate-500 text-xs leading-relaxed mb-6">
            {error || 'This barcode is not linked to any active product catalog item.'}
          </p>
          <a
            href="/"
            className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-6 py-3 rounded-xl transition-all shadow-md"
          >
            Go to ScanCule Homepage
          </a>
        </div>
      </div>
    )
  }

  const productName = getProductName()
  const productPrice = getProductPrice()
  const extraFields = getOtherFields()

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] text-slate-800 flex flex-col items-center justify-between p-4 py-8 font-sans selection:bg-orange-100 selection:text-orange-900">
      <div className="w-full max-w-md space-y-4">
        
        {/* Top Verified Badge */}
        <div className="flex items-center justify-between px-2 text-xs">
          <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 font-semibold px-3 py-1 rounded-full border border-emerald-200/60 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Verified ScanCule Partner</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 font-medium tracking-wider">
            #{product.unique_code}
          </span>
        </div>

        {/* 1. SHOP PROFILE CARD */}
        <div className="bg-white/90 backdrop-blur-md border border-orange-100 rounded-3xl p-6 shadow-xl shadow-orange-100/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-200/40 to-transparent rounded-bl-full pointer-events-none"></div>

          <div className="flex items-start space-x-4">
            {product.logo_url ? (
              <img 
                src={product.logo_url} 
                alt={product.shop_name} 
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md shadow-orange-100 shrink-0 bg-white"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center font-black text-2xl border-2 border-white shadow-md shadow-orange-100 shrink-0">
                {product.shop_name?.charAt(0)?.toUpperCase() || 'S'}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                <h1 className="text-lg font-black text-slate-900 truncate leading-tight">
                  {product.shop_name}
                </h1>
                <span className="text-blue-500 text-xs" title="Verified Merchant">✓</span>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className="text-[11px] bg-orange-50 text-orange-700 font-semibold px-2.5 py-0.5 rounded-lg border border-orange-100/80">
                  {product.shop_category || 'Retail Store'}
                </span>
                {product.plan_name && (
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-lg border border-amber-200/60 uppercase tracking-wider">
                    ★ {product.plan_name} Partner
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Shop Location & Contact Info */}
          {(product.address || product.contact_number) && (
            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 gap-2.5 text-xs text-slate-600">
              {product.address && (
                <div className="flex items-start space-x-2.5">
                  <span className="text-orange-500 text-sm shrink-0">📍</span>
                  <span className="leading-snug text-slate-700 font-medium">{product.address}</span>
                </div>
              )}

              {product.contact_number && (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-orange-500 text-sm shrink-0">📞</span>
                    <span className="font-semibold text-slate-800">{product.contact_number}</span>
                  </div>
                  <a
                    href={`tel:${product.contact_number}`}
                    className="bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[11px] px-3 py-1 rounded-lg border border-orange-200/60 transition-all"
                  >
                    Call Store
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. PRODUCT DETAILS CARD */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xl shadow-slate-200/40 space-y-5">
          
          {/* Header & Price Banner */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Authentic Product
              </span>
              <h2 className="text-xl font-black text-slate-900 leading-snug">
                {productName}
              </h2>
            </div>
            
            {productPrice && (
              <div className="text-right shrink-0 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/80 px-4 py-2 rounded-2xl shadow-xs">
                <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider block">Price</span>
                <span className="text-xl font-black text-orange-600">Rs. {productPrice}</span>
              </div>
            )}
          </div>

          {/* Barcode representation */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-center space-x-1 mb-2 opacity-85">
              {/* Decorative 1D barcode lines */}
              <div className="w-1.5 h-10 bg-slate-900"></div>
              <div className="w-0.5 h-10 bg-slate-900"></div>
              <div className="w-1 h-10 bg-slate-900"></div>
              <div className="w-2 h-10 bg-slate-900"></div>
              <div className="w-0.5 h-10 bg-slate-900"></div>
              <div className="w-1.5 h-10 bg-slate-900"></div>
              <div className="w-2 h-10 bg-slate-900"></div>
              <div className="w-0.5 h-10 bg-slate-900"></div>
              <div className="w-1.5 h-10 bg-slate-900"></div>
              <div className="w-1 h-10 bg-slate-900"></div>
              <div className="w-2 h-10 bg-slate-900"></div>
              <div className="w-0.5 h-10 bg-slate-900"></div>
              <div className="w-1.5 h-10 bg-slate-900"></div>
            </div>
            <span className="text-xs font-mono font-bold tracking-widest text-slate-700">
              {product.unique_code}
            </span>
          </div>

          {/* Additional Custom Fields */}
          {extraFields.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Specifications & Info</h3>
              <div className="grid grid-cols-1 gap-2.5">
                {extraFields.map((field, idx) => (
                  <div key={idx} className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">{field.label}</span>
                    <span className="text-xs font-bold text-slate-900 text-right">{field.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              onClick={handleShare}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3.5 px-4 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>{copied ? '✓ Link Copied to Clipboard!' : 'Share Product Information'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. BRANDING FOOTER */}
      <footer className="mt-8 text-center space-y-1">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
          Powered by
        </p>
        <p className="text-xs font-black text-slate-800 tracking-wider">
          ScanCule
        </p>
      </footer>
    </div>
  )
}
