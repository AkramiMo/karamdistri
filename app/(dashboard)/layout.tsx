import { AuthProvider } from '@/components/auth/AuthProvider'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { ActionsBar } from '@/components/layout/ActionsBar'
import { GlobalDialogsProvider } from '@/contexts/GlobalDialogsContext'
import { GlobalDialogs } from '@/components/dialogs/GlobalDialogs'
import { Toaster } from '@/components/ui/sonner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <GlobalDialogsProvider>
        <div className="flex h-screen bg-gray-100">
          {/* Sidebar Consultation à gauche */}
          <Sidebar />

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header en haut (logo, utilisateur, connexion) */}
            <Header />

            {/* Barre Actions en dessous du header */}
            <ActionsBar />

            <main className="flex-1 flex flex-col overflow-y-auto p-6 bg-white">
              {children}
            </main>
          </div>
        </div>
        <GlobalDialogs />
        <Toaster position="top-right" />
      </GlobalDialogsProvider>
    </AuthProvider>
  )
}
