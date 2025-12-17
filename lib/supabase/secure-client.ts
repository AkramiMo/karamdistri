/**
 * Supabase Secure Client - AKKA ERP
 * Health monitoring et retry logic (utilise le client singleton de client.ts)
 */

// Mode debug - réduit les logs en production
const DEBUG_MODE = process.env.NODE_ENV === 'development';

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

// Singleton Manager - utilise le client passé en paramètre
class SupabaseHealthManager {
  private static instance: SupabaseHealthManager;
  private connectionStatus: ConnectionStatus = 'unknown';
  private lastHealthCheck = 0;
  private retryCount = 0;
  private maxRetries = 3;
  private lastError?: string;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private getClientFn: (() => any) | null = null;

  private constructor() {
    if (DEBUG_MODE) {
      console.log('🛡️ Supabase Health Manager initialized');
    }
  }

  static getInstance(): SupabaseHealthManager {
    if (!SupabaseHealthManager.instance) {
      SupabaseHealthManager.instance = new SupabaseHealthManager();
    }
    return SupabaseHealthManager.instance;
  }

  // Initialiser avec la fonction pour obtenir le client
  initialize(getClient: () => any) {
    if (this.getClientFn) return; // Déjà initialisé

    this.getClientFn = getClient;

    // Délai avant le premier health check
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.initializeHealthMonitoring();
      }, 3000);
    }
  }

  private getClient() {
    if (!this.getClientFn) {
      throw new Error('SupabaseHealthManager not initialized');
    }
    return this.getClientFn();
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

  async performHealthCheck(): Promise<void> {
    // Skip si pas de client ou déjà en cours de check
    if (!this.getClientFn) return;
    if (this.isInitialized && Date.now() - this.lastHealthCheck < 5000) {
      return;
    }

    try {
      const client = this.getClient();
      const startTime = performance.now();

      // First check if user is authenticated
      const { data: { session } } = await client.auth.getSession();

      if (!session) {
        this.connectionStatus = 'unknown';
        this.isInitialized = true;
        this.lastHealthCheck = Date.now();
        return;
      }

      // User is authenticated, perform DB health check
      const { error } = await Promise.race([
        client.from('roles').select('id').limit(1),
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
        if (this.connectionStatus === 'failed' && attempt === 0) {
          await this.performHealthCheck();
        }

        const result = await this.withTimeout(operation(), 25000);

        if (result && typeof result === 'object' && 'error' in result) {
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

  private async backoffDelay(attempt: number): Promise<number> {
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    const totalDelay = Math.min(exponentialDelay + jitter, 10000);

    await new Promise(resolve => setTimeout(resolve, totalDelay));
    return totalDelay;
  }

  private async withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      operation,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

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

  async forceHealthCheck(): Promise<HealthStatus> {
    await this.performHealthCheck();
    return this.getHealthStatus();
  }

  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Export du singleton
const healthManager = SupabaseHealthManager.getInstance();

export const initializeHealthManager = (getClient: () => any) => {
  healthManager.initialize(getClient);
};

export const supabaseWithRetry = healthManager;

export const secureQuery = {
  async execute<T>(
    queryFn: () => Promise<T>,
    context: string = 'query'
  ): Promise<T> {
    return healthManager.executeWithRetry(queryFn, context);
  }
};

export const healthMonitor = {
  getStatus: () => healthManager.getHealthStatus(),
  forceCheck: () => healthManager.forceHealthCheck(),
  isHealthy: () => healthManager.getHealthStatus().healthy,
};

export default healthManager;
