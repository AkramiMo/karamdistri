'use client'

import { useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Singleton instance
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseInstance
}

export function useSupabase() {
  const supabase = useMemo(() => getSupabaseClient(), [])
  return supabase
}

// Helper function for queries with timeout
export async function queryWithTimeout<T>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
  timeoutMs: number = 10000
): Promise<{ data: T | null; error: Error | null }> {
  const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) => {
    setTimeout(() => {
      reject({ data: null, error: new Error('Query timeout') })
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([queryFn(), timeoutPromise])
    return result
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

// Retry logic for failed queries
export async function queryWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<{ data: T | null; error: Error | null }> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await queryWithTimeout(queryFn)

    if (result.data !== null || !result.error) {
      return result
    }

    lastError = result.error

    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)))
    }
  }

  return { data: null, error: lastError }
}
