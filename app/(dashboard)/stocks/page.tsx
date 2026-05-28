'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StocksPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/stocks/articles')
  }, [router])

  return null
}
