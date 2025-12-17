/**
 * Supabase Browser Client - AKKA ERP
 * Client principal avec support du secure client
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Flag pour activer/désactiver le logging détaillé
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Compteur de création de clients pour debugging
let clientCreationCount = 0;

export function createClient() {
  clientCreationCount++;

  if (DEBUG_MODE && clientCreationCount > 1) {
    console.log(`📊 Supabase client created (instance #${clientCreationCount})`);
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

  return createBrowserClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      debug: DEBUG_MODE,
    },
    global: {
      headers: {
        'x-application-name': 'akka-erp',
      },
      fetch: (url, options = {}) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          if (DEBUG_MODE) {
            console.warn('⏱️ Request timeout - aborting');
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
  })
}

// Export du secure client pour les opérations critiques
export { supabaseSecure, healthMonitor, secureQuery } from './secure-client';
