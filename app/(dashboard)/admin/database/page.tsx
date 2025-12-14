'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Users, Package, ShoppingCart, Truck, Building2 } from 'lucide-react'

interface TableStats {
  name: string
  count: number
  icon: React.ElementType
  color: string
}

export default function DatabasePage() {
  const [stats, setStats] = useState<TableStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)

      const tables = [
        { name: 'Utilisateurs', table: 'users', icon: Users, color: 'bg-blue-500' },
        { name: 'Clients', table: 'clients', icon: Users, color: 'bg-green-500' },
        { name: 'Articles', table: 'articles', icon: Package, color: 'bg-purple-500' },
        { name: 'Commandes', table: 'orders', icon: ShoppingCart, color: 'bg-orange-500' },
        { name: 'Livraisons', table: 'deliveries', icon: Truck, color: 'bg-teal-500' },
        { name: 'Fournisseurs', table: 'suppliers', icon: Building2, color: 'bg-yellow-500' },
      ]

      const results: TableStats[] = []

      for (const t of tables) {
        try {
          const { count } = await supabase
            .from(t.table)
            .select('*', { count: 'exact', head: true })

          results.push({
            name: t.name,
            count: count || 0,
            icon: t.icon,
            color: t.color,
          })
        } catch (error) {
          results.push({
            name: t.name,
            count: 0,
            icon: t.icon,
            color: t.color,
          })
        }
      }

      setStats(results)
      setIsLoading(false)
    }

    fetchStats()
  }, [supabase])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Base de données</h1>
        <p className="text-gray-500">Statistiques de la base de données</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Informations de connexion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Projet Supabase:</span>
              <p className="font-medium">jiqhqngmwktujbzppfhk</p>
            </div>
            <div>
              <span className="text-gray-500">Région:</span>
              <p className="font-medium">EU West</p>
            </div>
            <div>
              <span className="text-gray-500">Base de données:</span>
              <p className="font-medium">PostgreSQL</p>
            </div>
            <div>
              <span className="text-gray-500">Statut:</span>
              <p className="font-medium text-green-600">Connecté</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Statistiques des tables</h2>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <Card key={stat.name}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.count}</div>
                  <p className="text-xs text-gray-500">enregistrements</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liens utiles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <a
              href="https://supabase.com/dashboard/project/jiqhqngmwktujbzppfhk"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-green-600 hover:underline"
            >
              Dashboard Supabase
            </a>
            <a
              href="https://supabase.com/dashboard/project/jiqhqngmwktujbzppfhk/editor"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-green-600 hover:underline"
            >
              Table Editor
            </a>
            <a
              href="https://supabase.com/dashboard/project/jiqhqngmwktujbzppfhk/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-green-600 hover:underline"
            >
              SQL Editor
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
