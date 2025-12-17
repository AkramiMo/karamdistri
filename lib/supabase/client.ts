/**
 * Supabase Browser Client - AKKA ERP
 * Client SINGLETON pour éviter les instances multiples
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Flag pour activer/désactiver le logging détaillé
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// SINGLETON - Une seule instance du client
let supabaseInstance: SupabaseClient<Database> | null = null;
let instanceCreated = false;

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
    console.log('   URL:', url.substring(0, 35) + '...');
    instanceCreated = true;
  }

  supabaseInstance = createBrowserClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      debug: false, // Désactiver le debug auth pour réduire le bruit
    },
    global: {
      headers: {
        'x-application-name': 'akka-erp',
      },
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          if (DEBUG_MODE) {
            console.warn('⏱️ Request timeout after 20s - aborting');
          }
          controller.abort();
        }, 20000);

        const startTime = Date.now();

        return fetch(url, {
          ...options,
          signal: controller.signal,
        })
          .then(response => {
            const duration = Date.now() - startTime;
            if (DEBUG_MODE && duration > 3000) {
              console.warn(`⚠️ Slow request (${duration}ms)`);
            }
            return response;
          })
          .catch(error => {
            if (DEBUG_MODE) {
              console.error('🔴 Fetch error:', error.message);
            }
            throw error;
          })
          .finally(() => clearTimeout(timeoutId));
      }
    }
  });

  if (DEBUG_MODE) {
    console.log('✅ Supabase client ready (singleton instance)');
  }

  return supabaseInstance;
}

// Export du secure client pour les opérations critiques
export { supabaseSecure, healthMonitor, secureQuery } from './secure-client';

// Fonction pour réinitialiser le client (utile pour les tests ou déconnexion)
export function resetClient() {
  supabaseInstance = null;
  instanceCreated = false;
  if (DEBUG_MODE) {
    console.log('🔄 Supabase client reset');
  }
}
