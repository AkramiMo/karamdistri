'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsValidToken(!!session)
    }
    checkSession()

    // Listen for auth state changes (when user clicks the reset link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidToken(true)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) {
        setError(error.message)
        return
      }

      setIsSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      setError('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">Verification...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Lien invalide</CardTitle>
            <CardDescription>
              Ce lien de reinitialisation est invalide ou a expire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password">
              <Button className="w-full bg-[#B8860B] hover:bg-[#9A7209]">
                Demander un nouveau lien
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-[#B8860B]" />
            </div>
            <CardTitle className="text-2xl">Mot de passe modifie</CardTitle>
            <CardDescription>
              Votre mot de passe a ete mis a jour avec succes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              Redirection vers la page de connexion...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-[#B8860B]" />
          </div>
          <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
          <CardDescription>
            Choisissez un nouveau mot de passe securise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#B8860B] hover:bg-[#9A7209]"
              disabled={isLoading}
            >
              {isLoading ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
