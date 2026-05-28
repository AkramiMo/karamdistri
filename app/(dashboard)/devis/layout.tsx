'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { FileText, Users, Building2, FileInput } from 'lucide-react'

const tabs = [
  {
    name: 'Demande Devis Client',
    shortName: 'DDC',
    href: '/devis/ddc',
    icon: Users,
  },
  {
    name: 'Demande Devis Fournisseur',
    shortName: 'DDF',
    href: '/devis/ddf',
    icon: Building2,
  },
  {
    name: 'Reception Devis Fournisseur',
    shortName: 'RDF',
    href: '/devis/rdf',
    icon: FileInput,
  },
]

export default function DevisLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-7 w-7 text-[#B8860B]" />
          Devis
        </h1>
        <p className="text-gray-500">Gestion des demandes et réceptions de devis</p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm',
                  isActive
                    ? 'border-[#B8860B] text-[#B8860B]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <tab.icon
                  className={cn(
                    'mr-2 h-5 w-5',
                    isActive ? 'text-[#B8860B]' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                <span className="hidden md:inline">{tab.name}</span>
                <span className="md:hidden">{tab.shortName}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  )
}
