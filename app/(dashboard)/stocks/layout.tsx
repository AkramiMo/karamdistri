'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Button } from '@/components/ui/button'
import { Package, Leaf } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StocksLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isArticles = pathname === '/stocks/articles'
  const isFournitures = pathname === '/stocks/fournitures'

  return (
    <ProtectedModule module="stocks">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stocks</h1>
          <p className="text-gray-500">Gestion des stocks articles et fournitures</p>
        </div>

        <div className="flex gap-3">
          <Link href="/stocks/articles">
            <Button
              className={cn(
                'gap-2',
                isArticles
                  ? 'bg-[#9A7209] hover:bg-[#7A5A07]'
                  : 'bg-[#B8860B] hover:bg-[#9A7209]'
              )}
            >
              <Package className="h-4 w-4" />
              Stock Articles
            </Button>
          </Link>
          <Link href="/stocks/fournitures">
            <Button
              className={cn(
                'gap-2',
                isFournitures
                  ? 'bg-[#9A7209] hover:bg-[#7A5A07]'
                  : 'bg-[#B8860B] hover:bg-[#9A7209]'
              )}
            >
              <Leaf className="h-4 w-4" />
              Stock Fournitures
            </Button>
          </Link>
        </div>

        {children}
      </div>
    </ProtectedModule>
  )
}
