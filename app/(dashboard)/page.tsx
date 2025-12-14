'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Package,
  ShoppingCart,
  Truck,
  TrendingUp,
  DollarSign,
} from 'lucide-react'

export default function DashboardPage() {
  const stats = [
    {
      title: 'Clients',
      value: '0',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Articles',
      value: '0',
      icon: Package,
      color: 'bg-green-500',
    },
    {
      title: 'Commandes',
      value: '0',
      icon: ShoppingCart,
      color: 'bg-orange-500',
    },
    {
      title: 'Livraisons',
      value: '0',
      icon: Truck,
      color: 'bg-purple-500',
    },
    {
      title: 'Ventes (mois)',
      value: '0 DH',
      icon: TrendingUp,
      color: 'bg-teal-500',
    },
    {
      title: 'Caisse',
      value: '0 DH',
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500">Vue d&apos;ensemble de votre activité</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dernières commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-center py-8">
              Aucune commande pour le moment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Livraisons en cours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 text-center py-8">
              Aucune livraison en cours
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
