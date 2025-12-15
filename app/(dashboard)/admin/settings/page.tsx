'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Settings, Building, Mail, FileText, Banknote, Save, Loader2 } from 'lucide-react'

interface CompanySettings {
  id: string
  company_name: string
  address: string | null
  city: string | null
  postal_code: string | null
  phone: string | null
  fax: string | null
  email: string | null
  website: string | null
  ice: string | null
  if_number: string | null
  rc: string | null
  patente: string | null
  cnss: string | null
  capital: string | null
  bank_name: string | null
  bank_account: string | null
  bank_rib: string | null
  logo_url: string | null
  invoice_footer: string | null
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    company_name: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    fax: '',
    email: '',
    website: '',
    ice: '',
    if_number: '',
    rc: '',
    patente: '',
    cnss: '',
    capital: '',
    bank_name: '',
    bank_account: '',
    bank_rib: '',
    invoice_footer: '',
  })

  const fetchSettings = async () => {
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('company_settings') as any)
      .select('*')
      .single()

    // PGRST116 = no rows found, 42P01 = table doesn't exist
    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      console.error('Error fetching settings:', error)
      setMessage({ type: 'error', text: 'Erreur lors du chargement des paramètres. Veuillez exécuter la migration 013_company_settings.sql.' })
    }

    if (data) {
      const settingsData = data as CompanySettings
      setSettings(settingsData)
      setFormData({
        company_name: settingsData.company_name || '',
        address: settingsData.address || '',
        city: settingsData.city || '',
        postal_code: settingsData.postal_code || '',
        phone: settingsData.phone || '',
        fax: settingsData.fax || '',
        email: settingsData.email || '',
        website: settingsData.website || '',
        ice: settingsData.ice || '',
        if_number: settingsData.if_number || '',
        rc: settingsData.rc || '',
        patente: settingsData.patente || '',
        cnss: settingsData.cnss || '',
        capital: settingsData.capital || '',
        bank_name: settingsData.bank_name || '',
        bank_account: settingsData.bank_account || '',
        bank_rib: settingsData.bank_rib || '',
        invoice_footer: settingsData.invoice_footer || '',
      })
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    const dataToSave = {
      company_name: formData.company_name,
      address: formData.address || null,
      city: formData.city || null,
      postal_code: formData.postal_code || null,
      phone: formData.phone || null,
      fax: formData.fax || null,
      email: formData.email || null,
      website: formData.website || null,
      ice: formData.ice || null,
      if_number: formData.if_number || null,
      rc: formData.rc || null,
      patente: formData.patente || null,
      cnss: formData.cnss || null,
      capital: formData.capital || null,
      bank_name: formData.bank_name || null,
      bank_account: formData.bank_account || null,
      bank_rib: formData.bank_rib || null,
      invoice_footer: formData.invoice_footer || null,
      updated_at: new Date().toISOString(),
    }

    let error
    if (settings?.id) {
      // Update existing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase.from('company_settings') as any)
        .update(dataToSave)
        .eq('id', settings.id)
      error = result.error
    } else {
      // Insert new
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (supabase.from('company_settings') as any)
        .insert([dataToSave])
      error = result.error
    }

    if (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement' })
    } else {
      setMessage({ type: 'success', text: 'Paramètres enregistrés avec succès' })
      fetchSettings()
    }

    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres de l'entreprise</h1>
          <p className="text-gray-500">Configuration des informations pour les factures et documents</p>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Enregistrer tout
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informations générales
            </CardTitle>
            <CardDescription>
              Identité de l'entreprise
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nom de l'entreprise *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Nom de l'entreprise"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse de l'entreprise"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ville"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Code postal</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="Code postal"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capital">Capital social</Label>
              <Input
                id="capital"
                value={formData.capital}
                onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                placeholder="ex: 100 000 MAD"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact
            </CardTitle>
            <CardDescription>
              Coordonnées de contact
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+212 5XX XX XX XX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fax">Fax</Label>
              <Input
                id="fax"
                value={formData.fax}
                onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                placeholder="+212 5XX XX XX XX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@entreprise.ma"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Site web</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="www.entreprise.ma"
              />
            </div>
          </CardContent>
        </Card>

        {/* Identifiants fiscaux */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Identifiants légaux et fiscaux
            </CardTitle>
            <CardDescription>
              Informations obligatoires pour les factures au Maroc
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ice">ICE (Identifiant Commun de l'Entreprise)</Label>
              <Input
                id="ice"
                value={formData.ice}
                onChange={(e) => setFormData({ ...formData, ice: e.target.value })}
                placeholder="15 chiffres"
                maxLength={15}
              />
              <p className="text-xs text-gray-500">Obligatoire sur les factures</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="if_number">IF (Identifiant Fiscal)</Label>
              <Input
                id="if_number"
                value={formData.if_number}
                onChange={(e) => setFormData({ ...formData, if_number: e.target.value })}
                placeholder="Numéro d'identifiant fiscal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rc">RC (Registre de Commerce)</Label>
              <Input
                id="rc"
                value={formData.rc}
                onChange={(e) => setFormData({ ...formData, rc: e.target.value })}
                placeholder="Numéro de registre de commerce"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patente">Patente (Taxe Professionnelle)</Label>
              <Input
                id="patente"
                value={formData.patente}
                onChange={(e) => setFormData({ ...formData, patente: e.target.value })}
                placeholder="Numéro de patente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnss">CNSS</Label>
              <Input
                id="cnss"
                value={formData.cnss}
                onChange={(e) => setFormData({ ...formData, cnss: e.target.value })}
                placeholder="Numéro CNSS"
              />
            </div>
          </CardContent>
        </Card>

        {/* Informations bancaires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Informations bancaires
            </CardTitle>
            <CardDescription>
              Pour les paiements par virement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Banque</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Nom de la banque"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_account">Numéro de compte</Label>
              <Input
                id="bank_account"
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                placeholder="Numéro de compte bancaire"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank_rib">RIB</Label>
              <Input
                id="bank_rib"
                value={formData.bank_rib}
                onChange={(e) => setFormData({ ...formData, bank_rib: e.target.value })}
                placeholder="Relevé d'Identité Bancaire"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pied de page factures */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Personnalisation des factures
            </CardTitle>
            <CardDescription>
              Texte affiché en bas des factures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_footer">Pied de page des factures</Label>
              <Textarea
                id="invoice_footer"
                value={formData.invoice_footer}
                onChange={(e) => setFormData({ ...formData, invoice_footer: e.target.value })}
                placeholder="Merci pour votre confiance! Conditions de paiement: 30 jours..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
