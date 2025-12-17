'use client'

import { useState, useEffect, useCallback } from 'react'
import { healthMonitor } from '@/lib/supabase/client'

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

  // Initial check + interval
  useEffect(() => {
    // Check initial
    const initialStatus = healthMonitor.getStatus()
    setStatus(initialStatus)

    // Check périodique
    const interval = setInterval(() => {
      const currentStatus = healthMonitor.getStatus()
      setStatus(currentStatus)
    }, checkInterval)

    return () => clearInterval(interval)
  }, [checkInterval])

  return {
    ...status,
    isChecking,
    checkConnection,
  }
}

export default useConnectionStatus
