'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DevisPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/devis/ddc')
  }, [router])

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500">Redirection...</div>
    </div>
  )
}
