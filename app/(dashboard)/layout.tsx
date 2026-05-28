import { AuthProvider } from '@/components/auth/AuthProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Toaster } from '@/components/ui/sonner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
      <Toaster position="top-right" />
    </AuthProvider>
  )
}
