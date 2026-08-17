import React, { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'
import { supabase } from '../lib/supabaseClient'

/**
 * BarcodeScanner — Camera-based 1D barcode scanner
 * Props:
 *   shop: shop object (id, shop_name, google_sheet_id)
 *   products: array of shop products
 *   canUseSheets: boolean — whether this plan includes Sheets sync
 */
export default function BarcodeScanner({ shop, products, canUseSheets }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const controlsRef = useRef(null)

  const [scanning, setScanning] = useState(false)
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState('')
  const [lastScan, setLastScan] = useState(null)
  const [scanLog, setScanLog] = useState([])
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [sheetPushing, setSheetPushing] = useState(false)
  const [scanAction, setScanAction] = useState('Sale')
  const lastCodeRef = useRef('')

  const ACTIONS = ['Sale', 'Stock Check', 'Return', 'Transfer', 'Inventory']

  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devices) => {
        setCameras(devices)
        const rear = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        )
        setSelectedCamera(rear ? rear.deviceId : devices[0]?.deviceId || '')
      })
      .catch(() => {
        setStatus('Camera not accessible — please allow camera permissions in your browser.')
        setStatusType('error')
      })
  }, [])

  const stopScanning = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop() } catch (_) {}
      controlsRef.current = null
    }
    setScanning(false)
  }, [])

  const startScanning = useCallback(async () => {
    if (!selectedCamera) {
      setStatus('No camera found. Please allow camera access.')
      setStatusType('error')
      return
    }
    setStatus('Starting camera...')
    setStatusType('info')
    try {
      readerRef.current = new BrowserMultiFormatReader()
      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        selectedCamera,
        videoRef.current,
        async (result, err) => {
          if (result) {
            const code = result.getText()
            if (code === lastCodeRef.current) return
            lastCodeRef.current = code
            setTimeout(() => { lastCodeRef.current = '' }, 2500)
            await handleScanResult(code)
          }
          if (err && !(err instanceof NotFoundException)) {
            console.warn('Scanner:', err)
          }
        }
      )
      setScanning(true)
      setStatus('📷 Camera active — point at a barcode')
      setStatusType('info')
    } catch (err) {
      setStatus(`Failed to start camera: ${err.message}`)
      setStatusType('error')
      setScanning(false)
    }
  }, [selectedCamera, products, scanAction])

  useEffect(() => { return () => stopScanning() }, [stopScanning])

  const getProductName = (product) =>
    product?.custom_fields?.find(f => f.label.toLowerCase() === 'name')?.value || 'Unnamed'

  const getProductPrice = (product) =>
    product?.custom_fields?.find(f => f.label.toLowerCase() === 'price')?.value || null

  const formatTime = (date) =>
    date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const handleScanResult = async (code) => {
    const product = products.find(p => p.unique_code === code)
    const timestamp = new Date()
    const currentAction = scanAction

    const entry = { code, product: product || null, timestamp, action: currentAction }
    setLastScan(entry)
    setScanLog(prev => [entry, ...prev.slice(0, 49)])

    if (product) {
      setStatus(`✅ Found: ${getProductName(product)}`)
      setStatusType('success')
    } else {
      setStatus(`⚠️ Barcode "${code}" not found in your catalog`)
      setStatusType('error')
    }

    // Log scan to Supabase
    try {
      await supabase.from('scan_logs').insert({
        product_id: product?.id || null,
        shop_id: shop.id,
        scanned_at: timestamp.toISOString(),
        city: null,
        device_type: 'dashboard-scanner',
      })
    } catch (e) { console.warn('scan_log insert:', e) }

    // Auto-push to Google Sheets
    if (canUseSheets && shop?.google_sheet_id) {
      await pushToGoogleSheets(entry, {
        name: getProductName(product),
        price: getProductPrice(product)
      })
    }
  }

  const pushToGoogleSheets = async (entry, prod) => {
    if (!shop?.google_sheet_id) return
    setSheetPushing(true)
    try {
      const name = prod ? prod.name : 'Unknown Product'
      const price = prod ? prod.price : '-'
      
      const dt = entry.timestamp.toISOString().replace('T', ' ').slice(0, 19)
      const row = [dt, entry.code, name, `Rs. ${price}`, entry.action, 'camera-scanner']

      const res = await fetch(`http://${window.location.hostname}:8000/sync-scan`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer super-secret-default-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sheet_id: shop.google_sheet_id,
          row: row
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to append row')
      }
      setSheetStatus('Row Appended')
      setTimeout(() => setSheetStatus(null), 3000)
    } catch (err) {
      console.error('Sheet push error:', err)
      setSheetStatus('Sync Failed')
    } finally {
      setSheetPushing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Camera Barcode Scanner</h2>
        <p className="text-slate-500 text-xs mt-1">
          Scan barcodes with your camera. Each scan is logged{canUseSheets && shop?.google_sheet_id ? ' and auto-pushed to Google Sheets' : ''}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT: Camera + Result */}
        <div className="lg:col-span-3 space-y-4">

          {/* Controls Row */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Camera Source</label>
                <select
                  value={selectedCamera}
                  onChange={(e) => { stopScanning(); setSelectedCamera(e.target.value) }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  {cameras.length === 0 && <option>No cameras available</option>}
                  {cameras.map(c => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || `Camera ${c.deviceId.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Action Label</label>
                <select
                  value={scanAction}
                  onChange={(e) => setScanAction(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  {ACTIONS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <button
                onClick={scanning ? stopScanning : startScanning}
                className={`shrink-0 font-bold text-xs px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-md ${
                  scanning ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {scanning ? '⏹ Stop' : '📷 Start'}
              </button>
            </div>

            {status && (
              <div className={`mt-3 text-xs font-medium px-3 py-2 rounded-xl flex items-center gap-2 ${
                statusType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                statusType === 'error'   ? 'bg-red-50 text-red-700 border border-red-200' :
                                           'bg-slate-50 text-slate-600 border border-slate-200'
              }`}>
                <span>{status}</span>
                {sheetPushing && <span className="text-emerald-600 animate-pulse">· Syncing to Sheets...</span>}
              </div>
            )}
          </div>

          {/* Viewfinder */}
          <div className="bg-slate-900 rounded-3xl overflow-hidden relative" style={{ minHeight: '300px' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ minHeight: '300px', display: scanning ? 'block' : 'none' }}
              muted
              playsInline
            />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                <div className="text-7xl opacity-20">📷</div>
                <p className="text-sm font-semibold opacity-40">Camera not active</p>
                <p className="text-xs opacity-30">Select a camera and click Start</p>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-72 h-28 rounded-xl relative border-2 border-orange-400/60">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-orange-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-orange-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-orange-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-orange-400 rounded-br-lg" />
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent animate-bounce mx-4" style={{ top: '45%' }} />
                </div>
                <span className="absolute bottom-4 text-orange-300 text-[11px] font-black tracking-[0.2em] uppercase animate-pulse">
                  Scanning
                </span>
              </div>
            )}
          </div>

          {/* Last Scan */}
          {lastScan && (
            <div className={`rounded-3xl p-5 border-2 transition-all ${
              lastScan.product ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                  lastScan.product ? 'bg-emerald-100' : 'bg-amber-100'
                }`}>
                  {lastScan.product ? '✅' : '⚠️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                    Scanned at {formatTime(lastScan.timestamp)} · {lastScan.action}
                  </p>
                  <p className="font-mono font-black text-slate-900 text-base tracking-wider">{lastScan.code}</p>
                  {lastScan.product ? (
                    <div className="mt-1">
                      <p className="font-bold text-emerald-800">{getProductName(lastScan.product)}</p>
                      {getProductPrice(lastScan.product) && (
                        <p className="text-emerald-700 text-sm font-bold">Rs. {getProductPrice(lastScan.product)}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-amber-700 text-sm mt-1">Not found in your catalog</p>
                  )}
                  {canUseSheets && shop?.google_sheet_id && (
                    <button
                      onClick={() => pushToSheets(lastScan)}
                      disabled={sheetPushing}
                      className="mt-3 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer disabled:opacity-50"
                    >
                      {sheetPushing ? 'Pushing...' : '📊 Re-push to Sheets'}
                    </button>
                  )}
                </div>
                {lastScan.product?.barcode_url && (
                  <img
                    src={lastScan.product.barcode_url}
                    alt="barcode"
                    className="h-12 w-24 object-contain rounded-lg bg-white p-1 border border-slate-200 shrink-0"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Log + Info */}
        <div className="lg:col-span-2 space-y-4">

          {/* Sheets connection badge */}
          <div className={`rounded-2xl px-4 py-3 text-xs font-semibold flex items-center gap-2 border ${
            !canUseSheets
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : shop?.google_sheet_id
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              canUseSheets && shop?.google_sheet_id ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`} />
            {!canUseSheets
              ? '🔒 Sheets sync requires Basic plan or higher'
              : shop?.google_sheet_id
              ? '📊 Auto-pushing scans to Google Sheets'
              : '⚠️ Set up Google Sheets in the Sheets tab first'}
          </div>

          {/* Session Log */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col" style={{ maxHeight: '500px' }}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-sm font-bold text-slate-800">Session Log</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">{scanLog.length} scans</span>
                {scanLog.length > 0 && (
                  <button
                    onClick={() => { setScanLog([]); setLastScan(null) }}
                    className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {scanLog.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                <div className="text-4xl opacity-10 mb-2">🔍</div>
                <p className="text-xs text-slate-400">No scans yet this session</p>
                <p className="text-xs text-slate-300 mt-1">Start the scanner to begin</p>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                {scanLog.map((s, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${
                      s.product ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-black text-slate-800 text-[11px] truncate">{s.code}</p>
                      <p className={`font-semibold text-[11px] mt-0.5 truncate ${s.product ? 'text-emerald-700' : 'text-amber-600'}`}>
                        {s.product ? getProductName(s.product) : '⚠ Not in catalog'}
                      </p>
                      <p className="text-[10px] text-slate-400">{s.action} · {formatTime(s.timestamp)}</p>
                    </div>
                    {s.product && getProductPrice(s.product) && (
                      <span className="shrink-0 font-black text-orange-600 text-[11px]">Rs.{getProductPrice(s.product)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Columns legend */}
          {canUseSheets && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-700 mb-2">Columns sent to Sheets:</p>
              <div className="font-mono text-[11px] text-slate-500 space-y-1">
                <div><span className="text-orange-600 font-bold">A</span> Date & Time</div>
                <div><span className="text-orange-600 font-bold">B</span> Barcode Number</div>
                <div><span className="text-orange-600 font-bold">C</span> Product Name</div>
                <div><span className="text-orange-600 font-bold">D</span> Price</div>
                <div><span className="text-orange-600 font-bold">E</span> Action (Sale / Return…)</div>
                <div><span className="text-orange-600 font-bold">F</span> Source (camera-scanner)</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
