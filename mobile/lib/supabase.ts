import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

// Storage adapter that works on both web and native
const createStorageAdapter = () => {
  // On web, use localStorage
  if (Platform.OS === 'web') {
    return {
      getItem: async (key: string) => {
        try {
          return localStorage.getItem(key)
        } catch (e) {
          console.log('localStorage getItem error:', e)
          return null
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          localStorage.setItem(key, value)
        } catch (e) {
          console.log('localStorage setItem error:', e)
        }
      },
      removeItem: async (key: string) => {
        try {
          localStorage.removeItem(key)
        } catch (e) {
          console.log('localStorage removeItem error:', e)
        }
      },
    }
  }

  // On native (iOS/Android), use SecureStore
  return {
    getItem: async (key: string) => {
      try {
        return await SecureStore.getItemAsync(key)
      } catch (e) {
        console.log('SecureStore getItem error:', e)
        return null
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await SecureStore.setItemAsync(key, value)
      } catch (e) {
        console.log('SecureStore setItem error:', e)
      }
    },
    removeItem: async (key: string) => {
      try {
        await SecureStore.deleteItemAsync(key)
      } catch (e) {
        console.log('SecureStore removeItem error:', e)
      }
    },
  }
}

const storageAdapter = createStorageAdapter()

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

// Lazy initialization to avoid build-time errors
let supabaseInstance: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase credentials not configured')
      // Return a dummy client for build time
      return null as any
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: storageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  }
  return supabaseInstance
}

// For backward compatibility
export const supabase = {
  get auth() { return getSupabase()?.auth },
  get from() { return getSupabase()?.from.bind(getSupabase()) },
  get storage() { return getSupabase()?.storage },
}
