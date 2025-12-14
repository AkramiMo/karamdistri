'use client'

import Link from 'next/link'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, Shield, Settings, Database } from 'lucide-react'

export default function AdminPage() {
  const adminModules = [
    {
      title: 'Utilisateurs',
      description: 'Gérer les utilisateurs du système',
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-500',
    },
    {
      title: 'Rôles & Permissions',
      description: 'Configurer les rôles et leurs permissions',
      icon: Shield,
      href: '/admin/roles',
      color: 'bg-purple-500',
    },
    {
      title: 'Paramètres',
      description: 'Configuration générale du système',
      icon: Settings,
      href: '/admin/settings',
      color: 'bg-gray-500',
    },
    {
      title: 'Base de données',
      description: 'Voir les statistiques de la base',
      icon: Database,
      href: '/admin/database',
      color: 'bg-green-500',
    },
  ]

  return (
    <ProtectedModule module="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500">Gérez votre système ERP</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminModules.map((module) => (
            <Link key={module.href} href={module.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${module.color} flex items-center justify-center mb-4`}>
                    <module.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle>{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </ProtectedModule>
  )
}
