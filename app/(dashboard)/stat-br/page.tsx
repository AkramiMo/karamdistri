'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReceptionStats } from '@/components/receptions/ReceptionStats'
import { TotalStats } from '@/components/receptions/TotalStats'

interface Reception {
  id: string
  supplier_id: string
  total_ht: number | null
  supplier?: {
    name: string
  }
}

export default function StatBRPage() {
  const [receptions, setReceptions] = useState<Reception[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchReceptions = async () => {
    setIsLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('receptions') as any)
        .select(`
          id,
          supplier_id,
          total_ht,
          supplier:suppliers(name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching receptions:', error)
      } else {
        setReceptions(data || [])
      }
    } catch (err) {
      console.error('Exception fetching receptions:', err)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchReceptions()
  }, [])

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    const formatted = price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return `${formatted} MAD`
  }

  return (
    <ProtectedModule module="receptions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Statistiques BR</h1>
            <p className="text-gray-500">Statistiques des bons de réception</p>
          </div>
        </div>

        {/* Total HT par Fournisseur */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total HT par Fournisseur
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-gray-500">Chargement...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(() => {
                  // Calculer le total par fournisseur
                  const supplierTotals = receptions.reduce((acc, r) => {
                    const supplierId = r.supplier_id
                    const supplierName = r.supplier?.name || 'Inconnu'
                    if (!acc[supplierId]) {
                      acc[supplierId] = { name: supplierName, total: 0, count: 0 }
                    }
                    acc[supplierId].total += r.total_ht || 0
                    acc[supplierId].count += 1
                    return acc
                  }, {} as Record<string, { name: string; total: number; count: number }>)

                  // Trier par total décroissant
                  const sortedSuppliers = Object.entries(supplierTotals)
                    .sort(([, a], [, b]) => b.total - a.total)

                  if (sortedSuppliers.length === 0) {
                    return <p className="text-gray-500 col-span-full">Aucune réception</p>
                  }

                  return sortedSuppliers.map(([id, data]) => (
                    <div key={id} className="bg-gray-50 p-3 rounded-lg border">
                      <p className="font-medium text-sm truncate" title={data.name}>
                        {data.name}
                      </p>
                      <p className="text-lg font-bold text-[#B8860B]">
                        {formatPrice(data.total)}
                      </p>
                      <p className="text-xs text-gray-500">{data.count} BR</p>
                    </div>
                  ))
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiques de réception */}
        <ReceptionStats />

        {/* Statistique totale */}
        <TotalStats />
      </div>
    </ProtectedModule>
  )
}
