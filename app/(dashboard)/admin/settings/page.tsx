'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Building, Mail, Phone } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500">Configuration générale du système</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informations de l&apos;entreprise
            </CardTitle>
            <CardDescription>
              Informations générales sur votre entreprise
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nom de l&apos;entreprise</Label>
              <Input id="company_name" defaultValue="AKKA Olives & Sauces" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" placeholder="Adresse de l'entreprise" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" placeholder="Ville" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Code postal</Label>
                <Input id="postal_code" placeholder="Code postal" />
              </div>
            </div>
            <Button className="bg-green-600 hover:bg-green-700">
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact
            </CardTitle>
            <CardDescription>
              Informations de contact
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="contact@akka.ma" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" placeholder="+212 5XX XX XX XX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fax">Fax</Label>
              <Input id="fax" placeholder="+212 5XX XX XX XX" />
            </div>
            <Button className="bg-green-600 hover:bg-green-700">
              Enregistrer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Paramètres système
            </CardTitle>
            <CardDescription>
              Configuration technique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Input id="currency" defaultValue="MAD (Dirham Marocain)" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tva_default">TVA par défaut (%)</Label>
              <Input id="tva_default" type="number" defaultValue="20" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_format">Format de date</Label>
              <Input id="date_format" defaultValue="DD/MM/YYYY" disabled />
            </div>
            <Button className="bg-green-600 hover:bg-green-700">
              Enregistrer
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
