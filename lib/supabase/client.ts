/**
 * Supabase Browser Client - AKKA ERP
 * Client SINGLETON pour éviter les instances multiples
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { initializeHealthManager, healthMonitor, secureQuery, supabaseWithRetry } from './secure-client'

// Flag pour activer/désactiver le logging détaillé
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// SINGLETON - Une seule instance du client
let supabaseInstance: SupabaseClient<Database> | null = null;
let instanceCreated = false;
let healthManagerInitialized = false;

export function createClient(): SupabaseClient<Database> {
  // Retourner l'instance existante si elle existe
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ Missing Supabase credentials:', {
      url: url ? '✅' : '❌',
      key: key ? '✅' : '❌'
    });
    throw new Error('Missing Supabase credentials');
  }

  if (DEBUG_MODE && !instanceCreated) {
    console.log('🔧 Creating Supabase client (SINGLETON)');
    instanceCreated = true;
  }

  supabaseInstance = createBrowserClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      debug: false,
    },
    global: {
      headers: {
        'x-application-name': 'akka-erp',
      },
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 20000);

        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      }
    }
  });

  // Initialiser le health manager avec ce client (une seule fois)
  if (!healthManagerInitialized) {
    healthManagerInitialized = true;
    initializeHealthManager(() => supabaseInstance);
    if (DEBUG_MODE) {
      console.log('✅ Supabase client ready');
    }
  }

  return supabaseInstance;
}

// Export du health monitor et secure query
export { healthMonitor, secureQuery, supabaseWithRetry };

// Fonction pour réinitialiser le client
export function resetClient() {
  supabaseInstance = null;
  instanceCreated = false;
  healthManagerInitialized = false;
  if (DEBUG_MODE) {
    console.log('🔄 Supabase client reset');
  }
}
