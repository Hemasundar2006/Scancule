import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabaseClient'
import { useAppStore } from './lib/store'

// Import pages
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import OnboardingWizard from './pages/OnboardingWizard'
import ShopDashboard from './pages/ShopDashboard'
import AdminDashboard from './pages/AdminDashboard'
import PublicScanPage from './pages/PublicScanPage'
import AboutUs from './pages/AboutUs'
import Services from './pages/Services'
import ContactUs from './pages/ContactUs'
import Pricing from './pages/Pricing'

// A wrapper component to handle auth state and routing logic
function AuthWrapper({ children }) {
  const { 
    user, profile, shop,
    setUser, setProfile, setShop, setSubscription 
  } = useAppStore()

  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Initialize Auth listeners
    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          if (session.provider_token) {
            localStorage.setItem('google_provider_token', session.provider_token);
          }
          setUser(session.user)
          await loadUserProfileAndShop(session.user)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          if (session.provider_token) {
            localStorage.setItem('google_provider_token', session.provider_token);
          }
          setUser(session.user)
          await loadUserProfileAndShop(session.user)
        } else {
          localStorage.removeItem('google_provider_token');
          setUser(null)
          setProfile(null)
          setShop(null)
          setSubscription(null)
          setLoading(false)
        }
      }
    )

    return () => {
      authSubscription?.unsubscribe()
    }
  }, [])

  const loadUserProfileAndShop = async (currentUser) => {
    try {
      // Load user profile details
      let { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle()

      // If profile does not exist yet (e.g. Google OAuth new user or missing trigger), create it
      if (!userProfile) {
        const newProfile = {
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Shop Owner',
          role: 'shop_owner'
        }
        const { data: createdProfile, error: insertError } = await supabase
          .from('profiles')
          .upsert(newProfile)
          .select()
          .single()
        
        if (!insertError && createdProfile) {
          userProfile = createdProfile
        } else {
          userProfile = newProfile
        }
      }

      setProfile(userProfile)

      if (userProfile.role === 'admin') {
        setLoading(false)
        navigate('/admin')
        return
      }

      // Load shop details if role is shop_owner
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', currentUser.id)
        .maybeSingle()

      if (shopError) {
        console.warn('Error fetching shop:', shopError)
      }

      if (!shopData) {
        setShop(null)
        setLoading(false)
        navigate('/onboarding')
      } else {
        setShop(shopData)
        
        // Retrieve active subscription plan for this shop
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('*, plans (*)')
          .eq('shop_id', shopData.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!subError && subData) {
          setSubscription(subData)
        } else {
          setSubscription(null)
        }
        
        setLoading(false)
        
        // If we are on the auth page or landing page, redirect to dashboard
        const currentPath = window.location.pathname;
        if (currentPath === '/auth' || currentPath === '/') {
          navigate('/dashboard')
        }
      }
    } catch (err) {
      console.error('Error loading account metadata:', err)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-400 mb-4"></div>
        <p className="text-slate-400 text-sm tracking-wide">Connecting to systems...</p>
      </div>
    )
  }

  return children
}

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user } = useAppStore()
  if (!user) return <Navigate to="/auth" replace />
  return children
}

export default function App() {
  return (
    <Router>
      <AuthWrapper>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/pricing" element={<Pricing />} />
          
          {/* Dynamic Public Route */}
          <Route path="/p/:code" element={<PublicScanPage />} />

          {/* Protected Routes */}
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute>
                <OnboardingWizard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <ShopDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthWrapper>
    </Router>
  )
}
