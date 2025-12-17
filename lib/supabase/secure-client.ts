/**
 * Supabase Secure Client - AKKA ERP
 * Client robuste avec retry automatique, health monitoring et logging
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Mode debug - réduit les logs en production
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Validation des variables d'environnement
const validateEnvironment = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('🚨 CRITICAL: Missing Supabase credentials');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', url ? '✅ Set' : '❌ Missing');
    console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', key ? '✅ Set' : '❌ Missing');
    throw new Error('Missing Supabase credentials in environment');
  }

  if (!url.includes('.supabase.co')) {
    console.warn('⚠️ SECURITY: Supabase URL may be invalid:', url.substring(0, 30) + '...');
  }

  return { url, key };
};

const { url: SUPABASE_URL, key: SUPABASE_ANON_KEY } = validateEnvironment();

// Configuration avancée de connexion
const CONNECTION_CONFIG = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const,
    debug: process.env.NODE_ENV === 'development',
  },
  db: {
    schema: 'public' as const,
  },
  global: {
    headers: {
      'x-application-name': 'akka-erp',
      'x-client-version': '1.0.0',
    },
    // Fetch avec timeout
    fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('⏱️ Request timeout - aborting after 20s');
        controller.abort();
      }, 20000); // 20s timeout

      const startTime = Date.now();

      return fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          'Connection': 'keep-alive',
        },
      })
        .then(response => {
          const duration = Date.now() - startTime;
          if (duration > 5000) {
            console.warn(`⚠️ Slow request (${duration}ms): ${typeof url === 'string' ? url.split('?')[0] : 'Unknown'}`);
          }
          return response;
        })
        .finally(() => clearTimeout(timeoutId));
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    }
  }
};

// Types pour le status de connexion
type ConnectionStatus = 'healthy' | 'degraded' | 'failed' | 'unknown';

interface HealthStatus {
  status: ConnectionStatus;
  lastChecked: number;
  timeSinceLastCheck: number;
  isStale: boolean;
  retryCount: number;
  healthy: boolean;
  lastError?: string;
}

// Singleton Manager
class SupabaseSecureManager {
  private static instance: SupabaseSecureManager;
  private client: SupabaseClient<Database>;
  private connectionStatus: ConnectionStatus = 'unknown';
  private lastHealthCheck = 0;
  private retryCount = 0;
  private maxRetries = 3;
  private lastError?: string;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private constructor() {
    if (DEBUG_MODE) {
      console.log('🔧 Initializing Supabase Secure Client...');
    }

    this.client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, CONNECTION_CONFIG);

    // Délai avant le premier health check pour laisser le temps à l'auth de s'initialiser
    setTimeout(() => {
      this.initializeHealthMonitoring();
    }, 2000);
  }

  static getInstance(): SupabaseSecureManager {
    if (!SupabaseSecureManager.instance) {
      SupabaseSecureManager.instance = new SupabaseSecureManager();
    }
    return SupabaseSecureManager.instance;
  }

  getClient(): SupabaseClient<Database> {
    return this.client;
  }

  // Monitoring de santé
  private initializeHealthMonitoring() {
    // Check initial
    this.performHealthCheck();

    // Check toutes les 2 minutes
    if (typeof window !== 'undefined') {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthCheck();
      }, 120000);
    }
  }

  private async performHealthCheck(): Promise<void> {
    // Skip si déjà en cours de check
    if (this.isInitialized && Date.now() - this.lastHealthCheck < 5000) {
      return;
    }

    try {
      const startTime = performance.now();

      // First check if user is authenticated before querying protected tables
      const { data: { session } } = await this.client.auth.getSession();

      if (!session) {
        // Not authenticated yet, mark as initialized but skip DB health check
        this.connectionStatus = 'unknown';
        this.isInitialized = true;
        this.lastHealthCheck = Date.now();
        return;
      }

      // User is authenticated, perform DB health check
      const { error } = await Promise.race([
        this.client.from('roles').select('id').limit(1),
        new Promise<{ data: null; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);

      const responseTime = performance.now() - startTime;
      this.lastHealthCheck = Date.now();
      this.isInitialized = true;

      if (error) {
        this.connectionStatus = 'degraded';
        this.lastError = error.message;
        if (DEBUG_MODE) {
          console.warn(`⚠️ Health check: ${error.message} (${responseTime.toFixed(0)}ms)`);
        }
      } else if (responseTime > 3000) {
        this.connectionStatus = 'degraded';
        if (DEBUG_MODE) {
          console.warn(`⚠️ Connection slow: ${responseTime.toFixed(0)}ms`);
        }
      } else {
        this.connectionStatus = 'healthy';
        this.retryCount = 0;
        this.lastError = undefined;
        if (DEBUG_MODE) {
          console.log(`✅ Connection OK (${responseTime.toFixed(0)}ms)`);
        }
      }
    } catch (error) {
      this.connectionStatus = 'failed';
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      if (DEBUG_MODE) {
        console.error('🔴 Health check failed:', this.lastError);
      }
    }
  }

  // Retry avec backoff exponentiel
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string = 'database operation'
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Re-check santé si connexion failed
        if (this.connectionStatus === 'failed' && attempt === 0) {
          await this.performHealthCheck();
        }

        const result = await this.withTimeout(operation(), 25000);

        // Vérifier les erreurs Supabase
        if (result && typeof result === 'object' && 'error' in result) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const supabaseResult = result as unknown as { data: any; error: any };
          if (supabaseResult.error) {
            if (DEBUG_MODE) {
              console.error(`❌ ${context}:`, supabaseResult.error.message);
            }

            if (this.isRetryableError(supabaseResult.error) && attempt < this.maxRetries) {
              lastError = supabaseResult.error;
              await this.backoffDelay(attempt);
              continue;
            }
          }
        }

        // Succès
        this.retryCount = 0;
        return result;

      } catch (error) {
        lastError = error;

        if (DEBUG_MODE) {
          console.error(`❌ ${context} (attempt ${attempt + 1}):`, error instanceof Error ? error.message : error);
        }

        if (this.isRetryableError(error) && attempt < this.maxRetries) {
          this.retryCount++;
          await this.backoffDelay(attempt);
          continue;
        }

        break;
      }
    }

    if (DEBUG_MODE) {
      console.error(`💥 ${context} failed after ${this.maxRetries + 1} attempts`);
    }
    throw lastError;
  }

  // Classification des erreurs retryables
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const message = (error.message || error.details || '').toLowerCase();
    const code = String(error.code || '');

    const networkErrors = [
      'fetch', 'timeout', 'network', 'connection', 'abort',
      'econnreset', 'enotfound', 'etimedout', 'enetunreach',
      'failed to fetch', 'load failed'
    ];

    const temporaryErrors = [
      'rest_timeout', 'connection_timeout', 'server_error',
      'too many requests', 'rate limit'
    ];

    const retryableCodes = ['500', '502', '503', '504', '408', '429'];

    return networkErrors.some(err => message.includes(err)) ||
           temporaryErrors.some(err => message.includes(err)) ||
           retryableCodes.includes(code);
  }

  // Backoff exponentiel avec jitter
  private async backoffDelay(attempt: number): Promise<number> {
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    const totalDelay = Math.min(exponentialDelay + jitter, 10000);

    await new Promise(resolve => setTimeout(resolve, totalDelay));
    return totalDelay;
  }

  // Timeout wrapper
  private async withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      operation,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  // Status public
  getHealthStatus(): HealthStatus {
    const now = Date.now();
    const timeSinceCheck = now - this.lastHealthCheck;

    return {
      status: this.connectionStatus,
      lastChecked: this.lastHealthCheck,
      timeSinceLastCheck: timeSinceCheck,
      isStale: timeSinceCheck > 180000,
      retryCount: this.retryCount,
      healthy: this.connectionStatus === 'healthy' && timeSinceCheck < 180000,
      lastError: this.lastError,
    };
  }

  // Force health check
  async forceHealthCheck(): Promise<HealthStatus> {
    await this.performHealthCheck();
    return this.getHealthStatus();
  }

  // Cleanup
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Export du singleton
const supabaseManager = SupabaseSecureManager.getInstance();
export const supabaseSecure = supabaseManager.getClient();
export const supabaseWithRetry = supabaseManager;

// Wrapper de query avec retry
export const secureQuery = {
  async execute<T>(
    queryFn: () => Promise<T>,
    context: string = 'query'
  ): Promise<T> {
    return supabaseManager.executeWithRetry(queryFn, context);
  }
};

// Health monitoring
export const healthMonitor = {
  getStatus: () => supabaseManager.getHealthStatus(),
  forceCheck: () => supabaseManager.forceHealthCheck(),
  isHealthy: () => supabaseManager.getHealthStatus().healthy,
};

// Log au démarrage (une seule ligne)
if (DEBUG_MODE) {
  console.log('🛡️ Supabase Secure Client: retry=3, timeout=20s, health monitoring active');
}

export default supabaseSecure;
