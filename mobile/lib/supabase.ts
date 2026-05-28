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

console.log('Supabase URL:', supabaseUrl ? 'Configured' : 'MISSING!')
console.log('Supabase Key:', supabaseAnonKey ? 'Configured' : 'MISSING!')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
