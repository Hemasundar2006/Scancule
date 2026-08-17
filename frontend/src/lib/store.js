import { create } from 'zustand'

export const useAppStore = create((set) => ({
  user: null,         // Authenticated user object
  profile: null,      // User profile details from Supabase (e.g. role: 'admin' | 'shop_owner')
  shop: null,         // Current active shop profile
  subscription: null, // Active subscription and plan details
  
  // State setters
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setShop: (shop) => set({ shop }),
  setSubscription: (subscription) => set({ subscription }),
  
  // Log out reset
  logout: () => set({
    user: null,
    profile: null,
    shop: null,
    subscription: null
  })
}))
