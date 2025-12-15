'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from './useSupabase'
import { CompanySettings, defaultCompanySettings } from '@/lib/company'

export function useCompanySettings() {
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useSupabase()

  useEffect(() => {
    fetchCompanySettings()
  }, [])

  const fetchCompanySettings = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('company_settings') as any)
        .select('*')
        .limit(1)
        .single()

      if (error) {
        console.error('Error fetching company settings:', error)
        return
      }

      if (data) {
        setCompanySettings(data as CompanySettings)
      }
    } catch (err) {
      console.error('Error fetching company settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const refetch = () => {
    setIsLoading(true)
    fetchCompanySettings()
  }

  return { companySettings, isLoading, refetch }
}

// Standalone function to fetch company settings (for use outside React components)
export async function getCompanySettings(supabase: ReturnType<typeof useSupabase>): Promise<CompanySettings> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('company_settings') as any)
      .select('*')
      .limit(1)
      .single()

    if (error || !data) {
      return defaultCompanySettings
    }

    return data as CompanySettings
  } catch {
    return defaultCompanySettings
  }
}
