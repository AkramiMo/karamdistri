'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { healthMonitor, createClient } from '@/lib/supabase/client'

export interface ConnectionStatus {
  status: 'healthy' | 'degraded' | 'failed' | 'unknown' | 'checking'
  lastChecked: number
  timeSinceLastCheck: number
  isStale: boolean
  retryCount: number
  healthy: boolean
  lastError?: string
}

export function useConnectionStatus(checkInterval = 60000) {
  const [status, setStatus] = useState<ConnectionStatus>({
    status: 'unknown',
    lastChecked: 0,
    timeSinceLastCheck: 0,
    isStale: true,
    retryCount: 0,
    healthy: false,
  })
  const [isChecking, setIsChecking] = useState(false)
  const hasCheckedRef = useRef(false)

  const checkConnection = useCallback(async () => {
    setIsChecking(true)
    setStatus(prev => ({ ...prev, status: 'checking' }))

    try {
      const healthStatus = await healthMonitor.forceCheck()
      setStatus(healthStatus)
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        status: 'failed',
        healthy: false,
        lastError: error instanceof Error ? error.message : 'Check failed',
      }))
    } finally {
      setIsChecking(false)
    }
  }, [])

  // Initial check + interval + auth state listener
  useEffect(() => {
    const supabase = createClient()

    // Check initial
    const initialStatus = healthMonitor.getStatus()
    setStatus(initialStatus)

    // If status is unknown, trigger a check after a short delay
    if (initialStatus.status === 'unknown' && !hasCheckedRef.current) {
      hasCheckedRef.current = true
      setTimeout(() => {
        checkConnection()
      }, 1000)
    }

    // Listen for auth state changes - re-check when user logs in
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN') {
          // User just logged in, trigger health check
          setTimeout(() => {
            checkConnection()
          }, 500)
        }
      }
    )

    // Check périodique
    const interval = setInterval(() => {
      const currentStatus = healthMonitor.getStatus()
      setStatus(currentStatus)
    }, checkInterval)

    return () => {
      clearInterval(interval)
      subscription.unsubscribe()
    }
  }, [checkInterval, checkConnection])

  return {
    ...status,
    isChecking,
    checkConnection,
  }
}

export default useConnectionStatus
