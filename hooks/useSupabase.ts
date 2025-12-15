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
  queryFn: () => PromiseLike<{ data: T | null; error: Error | null }>,
  timeoutMs: number = 30000 // Increased to 30 seconds
): Promise<{ data: T | null; error: Error | null }> {
  const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => {
    setTimeout(() => {
      resolve({ data: null, error: new Error('Query timeout - la requête a pris trop de temps') })
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([Promise.resolve(queryFn()), timeoutPromise])
    return result
  } catch (error) {
    console.error('Query error:', error)
    return { data: null, error: error as Error }
  }
}

// Retry logic for failed queries
export async function queryWithRetry<T>(
  queryFn: () => PromiseLike<{ data: T | null; error: Error | null }>,
  maxRetries: number = 2, // Reduced retries
  delayMs: number = 500
): Promise<{ data: T | null; error: Error | null }> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await queryWithTimeout(queryFn)

      // Success - return data
      if (result.data !== null && !result.error) {
        return result
      }

      // Supabase returns data: [] with no error for empty results
      if (result.data !== null) {
        return result
      }

      lastError = result.error
      console.warn(`Query attempt ${attempt + 1}/${maxRetries} failed:`, result.error?.message)
    } catch (err) {
      lastError = err as Error
      console.warn(`Query attempt ${attempt + 1}/${maxRetries} threw:`, err)
    }

    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)))
    }
  }

  return { data: null, error: lastError }
}

// Simple query without retry - for fast queries
export async function querySimple<T>(
  queryFn: () => PromiseLike<{ data: T | null; error: Error | null }>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const result = await queryFn()
    return result
  } catch (error) {
    console.error('Simple query error:', error)
    return { data: null, error: error as Error }
  }
}
