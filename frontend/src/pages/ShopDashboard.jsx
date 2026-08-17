import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAppStore } from '../lib/store'
import BarcodeScanner from '../components/BarcodeScanner'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid 
} from 'recharts'

export default function ShopDashboard() {
  const { logout, shop, subscription } = useAppStore()

  // Derive plan tier from active subscription name
  // free = Free Trial (no active sub), basic = Basic, pro = Pro, enterprise = Enterprise
  const planName = (subscription?.plans?.name || 'Free Trial').toLowerCase()
  const planPrice = subscription?.plans?.price || 0
  const planTier = planPrice >= 9999 ? 'enterprise' : planPrice >= 799 ? 'pro' : planPrice >= 299 ? 'basic' : 'free'
  const canUseSheets = planTier !== 'free'
  const canUseBulkPrint = planTier === 'pro' || planTier === 'enterprise'
  const canSeeAnalytics = planTier !== 'free'
  const barcodeLimit = subscription?.plans?.barcode_limit || 10
  
  const [activeTab, setActiveTab] = useState('products')
  const [products, setProducts] = useState([])
  const [scanLogs, setScanLogs] = useState([])
  const [paymentSettings, setPaymentSettings] = useState(null)
  
  // Add / Edit Product Form State
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [prodName, setProdName] = useState('')
  const [prodCode, setProdCode] = useState('')
  const [customFields, setCustomFields] = useState([{ label: 'Price', value: '', visible_to_public: true }])
  const [formLoading, setFormLoading] = useState(false)
  
  // Billing Form State
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [plans, setPlans] = useState([])
  const [utr, setUtr] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingMsg, setBillingMsg] = useState(null)
  const [billingErr, setBillingErr] = useState(false)


  // Sheets Integration State
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsSyncing, setSheetsSyncing] = useState(false);
  const [sheetsMsg, setSheetsMsg] = useState(null);

  // Settings Form State
  const [settingsShopName, setSettingsShopName] = useState('')
  const [settingsCategory, setSettingsCategory] = useState('')
  const [settingsAddress, setSettingsAddress] = useState('')
  const [settingsContact, setSettingsContact] = useState('')
  const [settingsLogo, setSettingsLogo] = useState('')
  const [settingsSheetId, setSettingsSheetId] = useState('')
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState(null)

  // Search filter
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!shop) return
    loadProducts()
    loadScanLogs()
    setSettingsShopName(shop.shop_name || '')
    setSettingsCategory(shop.shop_category || 'Retail')
    setSettingsAddress(shop.address || '')
    setSettingsContact(shop.contact_number || '')
    setSettingsLogo(shop.logo_url || '')
    setSettingsSheetId(shop.google_sheet_id || '')
    
    loadPlans()
    loadPaymentSettings()

  }, [shop])

  const extractSheetId = (input) => {
    if (!input) return '';
    const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
  };

  const handleSaveSheetConfig = async (e) => {
    if (e) e.preventDefault();
    setSheetsLoading(true);
    setSheetsMsg(null);
    try {
      const cleanId = extractSheetId(settingsSheetId);
      const { error } = await supabase.from('shops').update({
        google_sheet_id: cleanId
      }).eq('id', shop.id);
      
      if (error) throw error;
      setSettingsSheetId(cleanId);
      if (shop) shop.google_sheet_id = cleanId;
      setSheetsMsg({ type: 'success', text: 'Google Sheet configuration saved successfully!' });
    } catch (err) {
      setSheetsMsg({ type: 'error', text: err.message || 'Failed to save configuration.' });
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleSyncAllProductsToSheets = async () => {
    const cleanId = extractSheetId(settingsSheetId || shop?.google_sheet_id);
    if (!cleanId) {
      setSheetsMsg({ type: 'error', text: 'Please enter and save a Google Sheet ID / URL first.' });
      return;
    }

    setSheetsSyncing(true);
    setSheetsMsg(null);

    try {
      const rows = products.map(p => {
        const name = p.custom_fields?.find(f => f.label.toLowerCase() === 'name')?.value || 'N/A';
        const price = p.custom_fields?.find(f => f.label.toLowerCase() === 'price')?.value || 'N/A';
        const date = p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
        return [date, p.unique_code, name, price, p.status || 'active'];
      });

      if (rows.length === 0) {
        throw new Error('No products in your catalog to sync. Create a product first.');
      }

      const res = await fetch(`https://scancule.onrender.com/sync-all`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer super-secret-default-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sheet_id: cleanId,
          rows: rows
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to sync to Google Sheets.');
      }

      setSheetsMsg({ type: 'success', text: `Successfully exported ${rows.length} product(s) to your Google Sheet!` });
    } catch (err) {
      setSheetsMsg({ type: 'error', text: err.message || 'Failed to sync to Google Sheets.' });
    } finally {
      setSheetsSyncing(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shop.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const loadScanLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('scan_logs')
        .select(`
          id,
          scanned_at,
          city,
          device_type,
          product_id,
          products (unique_code)
        `)
        .order('scanned_at', { ascending: false })

      if (error) throw error
      setScanLogs(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const loadPlans = async () => {
    try {
      const { data } = await supabase.from('plans').select('*').eq('is_active', true)
      setPlans(data || [])
      if (data && data.length > 0) {
        setSelectedPlanId(data[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const loadPaymentSettings = async () => {
    try {
      const { data } = await supabase.from('payment_settings').select('*').limit(1).maybeSingle()
      setPaymentSettings(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { label: '', value: '', visible_to_public: true }])
  }

  const handleRemoveCustomField = (index) => {
    setCustomFields(customFields.filter((_, idx) => idx !== index))
  }

  const handleFieldChange = (index, fieldKey, val) => {
    const updated = [...customFields]
    updated[index][fieldKey] = val
    setCustomFields(updated)
  }

  const generateRandomCode = () => {
    // Generate a clean 12-digit standard barcode number (e.g. 890XXXXXXXXX)
    return '890' + Math.floor(100000000 + Math.random() * 900000000).toString()
  }

  const handleOpenAddModal = () => {
    setEditingProduct(null)
    setProdName('')
    setProdCode(generateRandomCode())
    setCustomFields([
      { label: 'Price', value: '', visible_to_public: true },
      { label: 'Description', value: '', visible_to_public: true }
    ])
    setShowProductModal(true)
  }

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod)
    const nameField = prod.custom_fields.find(f => f.label.toLowerCase() === 'name')
    setProdName(nameField ? nameField.value : '')
    setProdCode(prod.unique_code)
    
    const filteredFields = prod.custom_fields.filter(f => f.label.toLowerCase() !== 'name')
    setCustomFields(filteredFields.length > 0 ? filteredFields : [{ label: 'Price', value: '', visible_to_public: true }])
    setShowProductModal(true)
  }

const syncToGoogleSheets = async (productData) => {
    if (!shop.google_sheet_id) return;
    
    // In a production app, we would use an edge function with a service account or refreshed token.
    // For this demonstration, we assume the user has a valid session provider_token from Google Login.
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.provider_token;
    
    if (!token) {
      console.warn('No Google provider token found. Cannot sync to Sheets.');
      return;
    }

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${shop.google_sheet_id}/values/A1:append?valueInputOption=USER_ENTERED`;
      const date = new Date().toISOString().split('T')[0];
      const name = productData.custom_fields.find(f => f.label.toLowerCase() === 'name')?.value || 'N/A';
      const price = productData.custom_fields.find(f => f.label.toLowerCase() === 'price')?.value || 'N/A';
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: 'A1',
          majorDimension: 'ROWS',
          values: [
            [date, productData.unique_code, name, price, 'active']
          ]
        })
      });
      
      if (!res.ok) {
        console.error('Google Sheets sync failed:', await res.text());
      }
    } catch (err) {
      console.error('Sheets sync error:', err);
    }
  }

  const handleSaveProduct = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    
    try {
      if (!prodName.trim()) throw new Error('Product Name is mandatory.')
      if (!prodCode.trim()) throw new Error('Product Unique Code is mandatory.')

      const fullCustomFields = [
        { label: 'Name', value: prodName, visible_to_public: true },
        ...customFields.filter(f => f.label.trim() !== '')
      ]

      let savedProduct = null

      if (editingProduct) {
        const { data, error } = await supabase
          .from('products')
          .update({
            unique_code: prodCode.trim(),
            custom_fields: fullCustomFields,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id)
          .select()
          .single()

        if (error) throw error
        savedProduct = data
      } else {
        const activeLimit = subscription?.plans?.barcode_limit || 10
        if (products.length >= activeLimit) {
          throw new Error(`Usage limit reached! Your plan allows a maximum of ${activeLimit} codes. Please upgrade in the Billing tab.`);
        }

        const { data, error } = await supabase
          .from('products')
          .insert({
            shop_id: shop.id,
            unique_code: prodCode.trim(),
            custom_fields: fullCustomFields
          })
          .select()
          .single()

        if (error) throw error
        savedProduct = data
      }

      // Generate Barcode and QR Code from Python Microservice
      try {
        const qrRes = await fetch('http://127.0.0.1:8000/generate-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer super-secret-default-token' },
          body: JSON.stringify({ unique_code: prodCode.trim(), shop_logo_url: shop.logo_url })
        });
        
        const barcodeRes = await fetch('http://127.0.0.1:8000/generate-barcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer super-secret-default-token' },
          body: JSON.stringify({ unique_code: prodCode.trim() })
        });

        if (qrRes.ok && barcodeRes.ok) {
          const qrBlob = await qrRes.blob();
          const barcodeBlob = await barcodeRes.blob();
          
          // Upload to Supabase Storage
          const qrPath = `${shop.id}/qr_${savedProduct.id}.png`;
          const bcPath = `${shop.id}/bc_${savedProduct.id}.png`;
          
          await supabase.storage.from('barcodes').upload(qrPath, qrBlob, { upsert: true, contentType: 'image/png' });
          await supabase.storage.from('barcodes').upload(bcPath, barcodeBlob, { upsert: true, contentType: 'image/png' });
          
          const { data: qrUrlData } = supabase.storage.from('barcodes').getPublicUrl(qrPath);
          const { data: bcUrlData } = supabase.storage.from('barcodes').getPublicUrl(bcPath);
          
          await supabase.from('products').update({
            qr_url: qrUrlData.publicUrl,
            barcode_url: bcUrlData.publicUrl
          }).eq('id', savedProduct.id);
        }
      } catch (assetErr) {
        console.error('Failed to generate or upload assets:', assetErr);
      }

      // Sync to Google Sheets if not editing (or you can do it on edit too)
      if (!editingProduct) {
        await syncToGoogleSheets(savedProduct);
      }

      setShowProductModal(false)
      loadProducts()

    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to save product.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteProduct = async (prodId) => {
    if (!confirm('Are you sure you want to delete this product? This will remove its scan logs and sync delete to Google Sheets.')) return
    try {
      const { error } = await supabase.from('products').delete().eq('id', prodId)
      if (error) throw error
      loadProducts()
    } catch (err) {
      console.error(err)
      alert('Delete failed.')
    }
  }

  const handleBulkPrintPdf = async () => {
    const filteredProducts = products.filter(p => {
      const nameField = p.custom_fields.find(f => f.label.toLowerCase() === 'name')
      const name = nameField ? nameField.value.toLowerCase() : ''
      return name.includes(searchTerm.toLowerCase()) || p.unique_code.toLowerCase().includes(searchTerm.toLowerCase())
    })

    if (filteredProducts.length === 0) {
      alert('No products to export.')
      return
    }

    try {
      setFormLoading(true)
      const labelProducts = filteredProducts.map(p => {
        const nameField = p.custom_fields.find(f => f.label.toLowerCase() === 'name')
        const priceField = p.custom_fields.find(f => f.label.toLowerCase() === 'price')
        return {
          unique_code: p.unique_code,
          name: nameField ? nameField.value : 'Product',
          price: priceField ? priceField.value : null
        }
      })

      const serviceUrl = 'http://127.0.0.1:8000/generate-bulk-pdf'
      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer super-secret-default-token'
        },
        body: JSON.stringify({ products: labelProducts })
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF sheet.')
      }

      const pdfBlob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', `${shop.shop_name}_labels.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (err) {
      console.error(err)
      alert('Bulk print failed. Ensure the Python barcode microservice is running.')
    } finally {
      setFormLoading(false)
    }
  }

  const handleUploadBillingProof = async (e) => {
    e.preventDefault()
    setBillingLoading(true)
    setBillingMsg(null)
    setBillingErr(false)

    try {
      if (!utr.trim()) throw new Error('Transaction Reference / UTR Number is required.')
      if (!uploadFile) throw new Error('Please select a payment screenshot receipt to upload.')

      const fileExt = uploadFile.name.split('.').pop()
      const fileName = `${shop.id}_${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('receipts')
        .upload(fileName, uploadFile, { upsert: true })

      if (uploadErr) throw uploadErr

      const { data: publicUrlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName)

      const { error: subErr } = await supabase
        .from('subscriptions')
        .insert({
          shop_id: shop.id,
          plan_id: selectedPlanId,
          status: 'pending',
          payment_proof_url: publicUrlData.publicUrl,
          transaction_ref: utr.trim()
        })

      if (subErr) throw subErr

      setBillingMsg('Payment receipt uploaded successfully! Admin will verify and activate your plan shortly.')
      setUtr('')
      setUploadFile(null)
    } catch (err) {
      console.error(err)
      setBillingErr(true)
      setBillingMsg(err.message || 'Failed to submit payment verification.')
    } finally {
      setBillingLoading(false)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSettingsLoading(true)
    setSettingsMsg(null)
    try {
      const { error } = await supabase.from('shops').update({
        shop_name: settingsShopName,
        shop_category: settingsCategory,
        address: settingsAddress,
        contact_number: settingsContact,
        logo_url: settingsLogo,
        google_sheet_id: settingsSheetId
      }).eq('id', shop.id)
      
      if (error) throw error
      setSettingsMsg({ type: 'success', text: 'Settings updated successfully. Please refresh to see changes globally.' })
    } catch (err) {
      setSettingsMsg({ type: 'error', text: err.message || 'Failed to update settings.' })
    } finally {
      setSettingsLoading(false)
    }
  }

  const handleElevateAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id)
      if (error) throw error
      alert("Successfully elevated to Admin! Please sign out and sign back in.")
    } catch (err) {
      alert("Failed to elevate to admin: " + err.message)
    }
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-2xl mb-4 shadow-sm">
          🏪
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">No Shop Found</h2>
        <p className="text-slate-500 text-sm max-w-sm mb-6">You haven't set up your shop yet, or your session is refreshing.</p>
        <div className="flex space-x-3">
          <button 
            onClick={() => window.location.href = '/onboarding'}
            className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer shadow-md transition-all"
          >
            Create Shop Profile
          </button>
          <button 
            onClick={logout}
            className="bg-white hover:bg-slate-50 border border-slate-250 text-slate-600 text-xs font-semibold px-5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  const filteredProducts = products.filter(p => {
    const nameField = p.custom_fields.find(f => f.label.toLowerCase() === 'name')
    const name = nameField ? nameField.value.toLowerCase() : ''
    return name.includes(searchTerm.toLowerCase()) || p.unique_code.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const scansByDate = () => {
    const counts = {}
    scanLogs.forEach(log => {
      const date = new Date(log.scanned_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      counts[date] = (counts[date] || 0) + 1
    })
    return Object.keys(counts).map(key => ({ date: key, scans: counts[key] })).reverse().slice(-10)
  }

  const deviceCounts = () => {
    const counts = { Mobile: 0, Tablet: 0, Desktop: 0 }
    scanLogs.forEach(log => {
      const type = log.device_type || 'Desktop'
      counts[type] = (counts[type] || 0) + 1
    })
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }))
  }

  const COLORS = ['#10b981', '#06b6d4', '#3b82f6']

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#fffaf4] to-[#FFDDB0] text-slate-800 flex flex-col font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Dashboard Top Navigation */}
      <header className="border-b border-slate-200/60 bg-white px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center font-black text-white shadow-sm">V</div>
          <div>
            <h1 className="font-extrabold text-sm leading-tight text-slate-900">{shop?.shop_name}</h1>
            <span className="text-[10px] text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 font-medium">
              Plan: {subscription?.plans?.name || 'Free Trial'}
            </span>
          </div>
        </div>
        <button 
          onClick={logout}
          className="text-xs bg-white hover:bg-slate-50 border border-slate-250 text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
        >
          Sign Out
        </button>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-60 flex flex-row md:flex-col gap-2 md:gap-1.5 shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory hide-scrollbar">
          <button 
            onClick={() => setActiveTab('products')}
            className={`shrink-0 md:w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer snap-start whitespace-nowrap ${activeTab === 'products' ? 'bg-white text-orange-700 shadow-sm border border-slate-200/60' : 'hover:bg-slate-100/50 text-slate-500'}`}
          >
            📦 Products Catalog
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`shrink-0 md:w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer snap-start whitespace-nowrap flex items-center justify-between space-x-2 ${activeTab === 'analytics' ? 'bg-white text-orange-700 shadow-sm border border-slate-200/60' : 'hover:bg-slate-100/50 text-slate-500'}`}
          >
            <span>📊 Scans Analytics</span>
            {!canSeeAnalytics && <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-md">BASIC+</span>}
          </button>

          <button 
            onClick={() => setActiveTab('billing')}
            className={`shrink-0 md:w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer snap-start whitespace-nowrap ${activeTab === 'billing' ? 'bg-white text-orange-700 shadow-sm border border-slate-200/60' : 'hover:bg-slate-100/50 text-slate-500'}`}
          >
            💳 Plan Subscription
          </button>


          <button
            onClick={() => setActiveTab('sheets')}
            className={`shrink-0 md:w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer snap-start whitespace-nowrap flex items-center justify-between space-x-2 ${activeTab === 'sheets' ? 'bg-white text-orange-700 shadow-sm border border-slate-200/60' : 'hover:bg-slate-100/50 text-slate-500'}`}
          >
            <span>📊 Google Sheets Sync</span>
            {!canUseSheets && <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-md">BASIC+</span>}
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`shrink-0 md:w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer snap-start whitespace-nowrap flex items-center justify-between space-x-2 ${activeTab === 'scanner' ? 'bg-white text-orange-700 shadow-sm border border-slate-200/60' : 'hover:bg-slate-100/50 text-slate-500'}`}
          >
            <span>📸 Barcode Scanner</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`shrink-0 md:w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer snap-start whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-orange-700 shadow-sm border border-slate-200/60' : 'hover:bg-slate-100/50 text-slate-500'}`}
          >
            ⚙️ Shop Settings
          </button>
        </aside>

        {/* Dashboard Pages */}
        <main className="flex-1 bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm">
          {/* TAB 1: PRODUCTS LIST */}
          {activeTab === 'products' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Products Catalog</h2>
                  <p className="text-slate-500 text-xs mt-1">Manage your items and download barcodes/QRs.</p>
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto">
                  {canUseBulkPrint ? (
                    <button
                      onClick={handleBulkPrintPdf}
                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm flex items-center space-x-1.5"
                    >
                      <span>🖨 Bulk Print Labels (PDF)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab('billing')}
                      className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm flex items-center space-x-1.5"
                      title="Upgrade to Pro to unlock Bulk Label PDF Export"
                    >
                      <span>🔒 Bulk Print Labels</span>
                      <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">PRO</span>
                    </button>
                  )}
                  <button 
                    onClick={handleOpenAddModal}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-md shadow-orange-600/10"
                  >
                    + Add Product
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products by name or unique code..." 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-600 transition-colors mb-6"
              />

              {/* Products Table */}
              {filteredProducts.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-12">No products found matching your description.</p>
              ) : (
                <div className="space-y-4">
                  {filteredProducts.map((p) => {
                    const nameField = p.custom_fields.find(f => f.label.toLowerCase() === 'name')
                    const priceField = p.custom_fields.find(f => f.label.toLowerCase() === 'price')
                    
                    return (
                      <div key={p.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-start space-x-4">
                          {p.barcode_url ? (
                            <img 
                              src={p.barcode_url} 
                              alt={`Barcode ${p.unique_code}`} 
                              className="h-14 w-28 object-contain rounded-lg bg-white p-1 border border-slate-200"
                            />
                          ) : (
                            <div className="h-14 w-28 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 text-center font-bold">
                              No Barcode
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-slate-850 text-sm">{nameField ? nameField.value : 'Unnamed Item'}</h3>
                            <p className="text-xs font-mono font-bold text-orange-600 mt-0.5 tracking-wider">#{p.unique_code}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Price: <span className="font-semibold text-slate-800">{priceField ? `Rs. ${priceField.value}` : 'N/A'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-center md:text-right shrink-0">
                            <span className="block text-xl font-black text-slate-800 leading-none">{p.scan_count || 0}</span>
                            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-1 block">Total Scans</span>
                          </div>
                          
                          <div className="flex space-x-1">
                            {p.barcode_url && (
                              <a 
                                href={p.barcode_url}
                                download={`barcode_${p.unique_code}.png`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs px-3 py-2 rounded-xl transition-all cursor-pointer block shadow-sm flex items-center space-x-1"
                              >
                                <span>Barcode</span>
                              </a>
                            )}
                            <button 
                              onClick={() => handleOpenEditModal(p)}
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(p.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div>
              {!canSeeAnalytics ? (
                /* LOCKED: Basic+ required */
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center text-3xl mb-4 border border-amber-100">
                    🔒
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mb-2">Analytics Requires Basic Plan</h2>
                  <p className="text-slate-500 text-sm max-w-sm mb-6">
                    Upgrade to <strong>Basic (Rs. 299/mo)</strong> or higher to unlock device breakdown charts, scan timelines, and geo-location tracking.
                  </p>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer shadow-md"
                  >
                    🚀 Upgrade Plan — View Pricing
                  </button>
                  <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 w-full max-w-sm text-left">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">What you'll unlock:</p>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {['Device type breakdown (Mobile / Desktop)', 'Scan count timeline chart (30 days)', 'Per-product scan metrics', 'Geo-location tracking (Pro+)'].map((f, i) => (
                        <li key={i} className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[10px]">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-6">Catalog Scan Analytics</h2>
                  {scanLogs.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-12">No scan interactions recorded yet. Print and stick barcodes to gather metrics.</p>
                  ) : (
                    <div className="space-y-8">
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 mb-4">Unique Scans Over Time</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={scansByDate()}>
                              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
                              <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                              <YAxis stroke="#64748b" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }} />
                              <Line type="monotone" dataKey="scans" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
                          <h3 className="text-sm font-bold text-slate-800 mb-4">Devices Used</h3>
                          <div className="h-48 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={deviceCounts()}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {deviceCounts().map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex justify-center space-x-6 text-xs text-slate-500 mt-2">
                            {deviceCounts().map((entry, idx) => (
                              <div key={idx} className="flex items-center space-x-1.5">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                                <span>{entry.name} ({entry.value})</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                          <h3 className="text-sm font-bold text-slate-800 mb-4">Scans by City</h3>
                          <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                            {Array.from(new Set(scanLogs.map(l => l.city || 'Unknown'))).map((city, idx) => {
                              const count = scanLogs.filter(l => (l.city || 'Unknown') === city).length
                              return (
                                <div key={idx} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                                  <span className="text-xs text-slate-700 font-medium">{city}</span>
                                  <span className="text-xs font-bold bg-slate-50 text-orange-600 px-2 py-0.5 rounded-lg border border-slate-200">{count}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BILLING */}
          {activeTab === 'billing' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Subscription Plans & Feature Comparison</h2>
                <p className="text-slate-500 text-xs mt-1">See exactly what's included in each plan. Click a plan to select it for upgrade.</p>
              </div>

              {billingMsg && (
                <div className={`p-4 rounded-2xl text-sm border ${billingErr ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                  {billingMsg}
                </div>
              )}

              {/* FEATURE COMPARISON TABLE */}
              <div className="bg-white border border-slate-200 rounded-3xl overflow-x-auto shadow-sm">
                <div className="min-w-[700px]">
                {/* Plan Header Row */}
                <div className="grid grid-cols-5 border-b border-slate-100">
                  <div className="p-5 bg-slate-50 border-r border-slate-100">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Feature</span>
                  </div>
                  {plans.map((p) => {
                    const isSelected = selectedPlanId === p.id
                    const isCurrent = subscription?.plan_id === p.id || (!subscription && p.name === 'Free Trial')
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`p-5 text-left border-r border-slate-100 last:border-r-0 transition-all cursor-pointer relative ${
                          isSelected ? 'bg-orange-50' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        {isCurrent && (
                          <span className="absolute top-2 right-2 text-[9px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                            Active
                          </span>
                        )}
                        <p className={`font-extrabold text-sm ${isSelected ? 'text-orange-600' : 'text-slate-900'}`}>{p.name}</p>
                        <p className="text-xl font-black text-slate-900 mt-1">
                          Rs. {p.price}
                          <span className="text-slate-400 text-[10px] font-medium ml-1">/ {p.billing_cycle || `${p.duration_days}d`}</span>
                        </p>
                        <div className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-md w-fit ${
                          isSelected ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isSelected ? (isCurrent ? '✓ Current Plan' : '✓ Selected') : 'Select'}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Feature Rows */}
                {[
                  {
                    category: '📦 Barcode Generation',
                    rows: [
                      {
                        feature: 'Max Product Barcodes',
                        free: '10 items', basic: '200 items', pro: '2,000 items', enterprise: 'Unlimited'
                      },
                      {
                        feature: '1D Barcode with Human-Readable Numbers',
                        free: true, basic: true, pro: true, enterprise: true
                      },
                      {
                        feature: 'Individual Barcode Image Download',
                        free: true, basic: true, pro: true, enterprise: true
                      },
                      {
                        feature: 'Bulk Label PDF Export (A4, 21/page)',
                        free: false, basic: false, pro: true, enterprise: true
                      },
                    ]
                  },
                  {
                    category: '🌐 Public Scan Page',
                    rows: [
                      {
                        feature: 'Public Customer-Facing Scan Page',
                        free: 'Basic', basic: 'Branded', pro: 'Premium', enterprise: 'VIP'
                      },
                      {
                        feature: 'Store Logo Displayed on Scan',
                        free: false, basic: true, pro: true, enterprise: true
                      },
                      {
                        feature: 'Store Name & Category Badge',
                        free: true, basic: true, pro: true, enterprise: true
                      },
                      {
                        feature: 'Store Address & Location on Scan',
                        free: false, basic: false, pro: true, enterprise: true
                      },
                      {
                        feature: 'Click-to-Call Store Button',
                        free: false, basic: false, pro: true, enterprise: true
                      },
                      {
                        feature: 'Verified Partner Badge',
                        free: false, basic: '★ Basic', pro: '★ Pro', enterprise: '★ VIP'
                      },
                    ]
                  },
                  {
                    category: '📊 Google Sheets Integration',
                    rows: [
                      {
                        feature: 'Real-time Auto-Sync on Product Save',
                        free: false, basic: true, pro: true, enterprise: true
                      },
                      {
                        feature: 'Bulk Sync All Products to Sheets',
                        free: false, basic: true, pro: true, enterprise: true
                      },
                      {
                        feature: 'Custom Spreadsheet URL Configuration',
                        free: false, basic: true, pro: true, enterprise: true
                      },
                    ]
                  },
                  {
                    category: '📈 Analytics & Insights',
                    rows: [
                      {
                        feature: 'Total Scan Count',
                        free: true, basic: true, pro: true, enterprise: true
                      },
                      {
                        feature: 'Device Type Breakdown (Mobile/Desktop)',
                        free: false, basic: true, pro: true, enterprise: true
                      },
                      {
                        feature: 'Scan Timeline Chart (30 days)',
                        free: false, basic: true, pro: true, enterprise: true
                      },
                      {
                        feature: 'Geo-Location Scan Tracking',
                        free: false, basic: false, pro: true, enterprise: true
                      },
                    ]
                  },
                  {
                    category: '🛎 Support',
                    rows: [
                      {
                        feature: 'Support Channel',
                        free: 'Community', basic: 'Email (24h)', pro: 'WhatsApp Priority', enterprise: '24/7 Dedicated'
                      },
                    ]
                  },
                ].map((section, sIdx) => (
                  <div key={sIdx}>
                    {/* Section Header */}
                    <div className="grid grid-cols-5 bg-slate-50/80 border-t border-slate-100">
                      <div className="col-span-5 px-5 py-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {section.category}
                      </div>
                    </div>
                    {/* Feature Rows */}
                    {section.rows.map((row, rIdx) => {
                      const cells = [
                        { planIndex: 0, value: row.free },
                        { planIndex: 1, value: row.basic },
                        { planIndex: 2, value: row.pro },
                        { planIndex: 3, value: row.enterprise },
                      ]
                      return (
                        <div key={rIdx} className="grid grid-cols-5 border-t border-slate-100 hover:bg-slate-50/30 transition-colors">
                          <div className="p-4 border-r border-slate-100 flex items-center">
                            <span className="text-xs text-slate-700 font-medium">{row.feature}</span>
                          </div>
                          {cells.map(({ planIndex, value }) => {
                            const planObj = plans[planIndex]
                            const isColSelected = planObj && selectedPlanId === planObj.id
                            return (
                              <div
                                key={planIndex}
                                className={`p-4 border-r border-slate-100 last:border-r-0 flex items-center justify-center ${
                                  isColSelected ? 'bg-orange-50/40' : ''
                                }`}
                              >
                                {value === true ? (
                                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">✓</span>
                                ) : value === false ? (
                                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center font-bold text-xs">—</span>
                                ) : (
                                  <span className={`text-[11px] font-semibold text-center leading-tight ${
                                    typeof value === 'string' && value.startsWith('★') ? 'text-amber-600 font-bold' : 'text-slate-700'
                                  }`}>
                                    {value}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                ))}
                </div>
              </div>

              {/* CURRENT USAGE BAR + PAYMENT FORM */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Usage Status */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
                  <div>
                    <h3 className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Active Plan</h3>
                    <p className="text-2xl font-black text-slate-900">{subscription?.plans?.name || 'Free Trial'}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                      <span>Barcode Usage</span>
                      <span className="font-semibold">{products.length} / {subscription?.plans?.barcode_limit || 10}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min((products.length / (subscription?.plans?.barcode_limit || 10)) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {Math.max(0, (subscription?.plans?.barcode_limit || 10) - products.length)} barcodes remaining on your current plan
                    </p>
                  </div>
                </div>

                {/* Payment Proof Form */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-4">Submit Payment for Upgrade</h3>
                  {paymentSettings ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs text-slate-500 space-y-1">
                      <p className="font-bold text-slate-700 mb-1">Payment Details:</p>
                      <p>UPI ID: <span className="font-bold text-orange-600 select-all">{paymentSettings.upi_id || 'admin@upi'}</span></p>
                      {paymentSettings.bank_details && (
                        <pre className="font-sans whitespace-pre-wrap text-slate-600 text-[11px]">{paymentSettings.bank_details}</pre>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mb-4">Loading payment details...</p>
                  )}

                  <form onSubmit={handleUploadBillingProof} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Upgrading To</label>
                      <select
                        value={selectedPlanId}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-medium"
                      >
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} — Rs. {p.price} ({p.barcode_limit >= 99999 ? 'Unlimited' : p.barcode_limit} barcodes)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">UTR / Transaction Reference</label>
                      <input
                        type="text"
                        required
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        placeholder="e.g. 423984729182"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Payment Screenshot</label>
                      <input
                        type="file"
                        required
                        accept="image/*"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-orange-50 file:text-orange-700 file:cursor-pointer"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={billingLoading}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 shadow-md"
                    >
                      {billingLoading ? 'Uploading proof...' : '🚀 Submit for Admin Approval'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GOOGLE SHEETS INTEGRATION */}

          {activeTab === 'sheets' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Google Sheets Integration</h2>
                <p className="text-slate-500 text-xs mt-1">Automatically synchronize your product inventory and barcode logs directly to your own Google Spreadsheet.</p>
              </div>

              {!canUseSheets ? (
                /* LOCKED: Basic+ required */
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center text-3xl mb-4 border border-emerald-100">
                    🔒
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mb-2">Google Sheets Requires Basic Plan</h2>
                  <p className="text-slate-500 text-sm max-w-sm mb-6">
                    Upgrade to <strong>Basic (Rs. 299/mo)</strong> or higher to sync your entire product catalog and barcodes to a Google Spreadsheet in real-time.
                  </p>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer shadow-md"
                  >
                    🚀 Upgrade Plan — View Pricing
                  </button>
                  <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 w-full max-w-sm text-left">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">What you'll unlock:</p>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {['Real-time auto-sync when saving products', 'Bulk sync all products at once', 'Custom Google Spreadsheet URL', 'Barcode data exported automatically'].map((f, i) => (
                        <li key={i} className="flex items-center space-x-2">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[10px]">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">

              {sheetsMsg && (
                <div className={`p-4 rounded-2xl text-sm border ${sheetsMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                  {sheetsMsg.text}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Card: Connection & Config */}
                <div className="lg:col-span-2 space-y-6">
                  {/* STEP 1: Spreadsheet Config */}

                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-lg shrink-0">🔗</div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Paste your Google Sheet URL</h3>
                        <p className="text-xs text-slate-500">Ensure you have shared the sheet with the Service Account email first.</p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveSheetConfig} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Google Sheet URL or Spreadsheet ID</label>
                        <input
                          type="text"
                          value={settingsSheetId}
                          onChange={(e) => setSettingsSheetId(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-600 transition-colors"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <button
                          type="submit"
                          disabled={sheetsLoading}
                          className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-orange-600/10 cursor-pointer disabled:opacity-50"
                        >
                          {sheetsLoading ? 'Saving...' : '💾 Save Sheet ID'}
                        </button>

                        <button
                          type="button"
                          onClick={handleSyncAllProductsToSheets}
                          disabled={sheetsSyncing || !settingsSheetId}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                          <span>{sheetsSyncing ? 'Syncing...' : '⚡ Sync All Products Now'}</span>
                        </button>

                        {settingsSheetId && (
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${extractSheetId(settingsSheetId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto text-center bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                          >
                            ↗ Open Sheet
                          </a>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

                {/* Right Card: Step by Step Guide & Format */}
                <div className="space-y-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-xs text-slate-600 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">How to Set Up</h3>
                    <ol className="space-y-3 text-slate-600 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Open <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-orange-600 underline font-semibold">Google Sheets</a> and create a new blank sheet.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Click <strong>"Share"</strong> in the top right and add the Service Account email. (Check the guide to generate your credentials if you don't have this). Ensure it is an <strong>Editor</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Copy the URL of your Google Sheet, paste it above, and click <strong>Save Sheet ID</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                        <span>Click <strong>⚡ Sync All Products Now</strong> — all your barcodes will appear in the sheet!</span>
                      </li>
                    </ol>

                    <div className="border-t border-slate-200/60 pt-4">
                      <p className="font-bold text-slate-800 mb-2">Columns exported to your Sheet:</p>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 font-mono text-[11px] space-y-1 text-slate-600">
                        <div><span className="text-orange-600 font-bold">A</span> — Date (YYYY-MM-DD)</div>
                        <div><span className="text-orange-600 font-bold">B</span> — Barcode Number (12 digits)</div>
                        <div><span className="text-orange-600 font-bold">C</span> — Product Name</div>
                        <div><span className="text-orange-600 font-bold">D</span> — Price (Rs.)</div>
                        <div><span className="text-orange-600 font-bold">E</span> — Status</div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
              )} {/* end canUseSheets */}
            </div>
          )}

          {/* TAB: SCANNER */}
          {activeTab === 'scanner' && (
            <BarcodeScanner
              shop={shop}
              products={products}
              canUseSheets={canUseSheets}
            />
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6">Shop Settings</h2>
              
              {settingsMsg && (
                <div className={`p-4 rounded-2xl text-sm mb-6 border ${settingsMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                  {settingsMsg.text}
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-2xl">
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Shop Name</label>
                      <input 
                        type="text" 
                        required 
                        value={settingsShopName}
                        onChange={(e) => setSettingsShopName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-600 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Store Category</label>
                      <select 
                        value={settingsCategory}
                        onChange={(e) => setSettingsCategory(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-orange-600 transition-colors"
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
                      value={settingsContact}
                      onChange={(e) => setSettingsContact(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Physical Address</label>
                    <textarea 
                      value={settingsAddress}
                      onChange={(e) => setSettingsAddress(e.target.value)}
                      rows="2"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-600 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Logo URL (Optional)</label>
                    <input 
                      type="url" 
                      value={settingsLogo}
                      onChange={(e) => setSettingsLogo(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-600 transition-colors"
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-5 mt-5">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Google Sheets Auto-Sync Setup</h3>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Google Sheet URL or ID</label>
                      <input 
                        type="text" 
                        value={settingsSheetId}
                        onChange={(e) => setSettingsSheetId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-600 transition-colors"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={settingsLoading}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-orange-600/10 cursor-pointer disabled:opacity-50 mt-4"
                  >
                    {settingsLoading ? 'Saving...' : 'Save Settings'}
                  </button>

                  <div className="border-t border-slate-100 pt-5 mt-5 text-center">
                    <button 
                      type="button" 
                      onClick={handleElevateAdmin}
                      className="text-xs font-bold text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      (Dev Tool) Elevate my account to Admin
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Product Create / Edit Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">{editingProduct ? 'Edit Catalog Product' : 'Add New Product'}</h2>
              <button 
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-800 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Product Name *</label>
                <input 
                  type="text" 
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Premium Leather Wallet" 
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-orange-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Unique Code *</label>
                  <input 
                    type="text" 
                    required
                    value={prodCode}
                    onChange={(e) => setProdCode(e.target.value)}
                    placeholder="PRD982" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-orange-600 font-mono"
                  />
                </div>
                <div className="self-end pb-1">
                  <button 
                    type="button" 
                    onClick={() => setProdCode(generateRandomCode())}
                    className="text-xs text-orange-700 bg-orange-50 border border-orange-100 px-3 py-2.5 rounded-xl hover:bg-orange-100/60 transition-all cursor-pointer font-semibold"
                  >
                    Generate Random Code
                  </button>
                </div>
              </div>

              {/* Dynamic Field Builder */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-slate-800">Custom Attributes Builder</h3>
                  <button 
                    type="button" 
                    onClick={handleAddCustomField}
                    className="text-orange-600 text-xs hover:underline cursor-pointer"
                  >
                    + Add Attribute
                  </button>
                </div>

                <div className="space-y-3">
                  {customFields.map((field, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-150">
                      <input 
                        type="text" 
                        required
                        value={field.label}
                        onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                        placeholder="Label (e.g. Expiry Date)" 
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-600 flex-1"
                      />
                      <input 
                        type="text" 
                        required
                        value={field.value}
                        onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                        placeholder="Value (e.g. Dec 2026)" 
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-600 flex-1"
                      />
                      <div className="flex items-center justify-between space-x-2 shrink-0">
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={field.visible_to_public}
                            onChange={(e) => handleFieldChange(index, 'visible_to_public', e.target.checked)}
                            className="rounded border-slate-350 text-orange-600 focus:ring-emerald-600 bg-white"
                          />
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">Public</span>
                        </label>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveCustomField(index)}
                          className="text-red-650 text-xs hover:underline pl-2 border-l border-slate-200 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setShowProductModal(false)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={formLoading}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {formLoading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
