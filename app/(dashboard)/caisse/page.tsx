'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface CashEntry {
  id: string
  transaction_date: string
  category: string | null
  operation_type: string | null
  amount: number
  reference: string | null
  notes: string | null
  created_at: string
}

export default function CaissePage() {
  const [entries, setEntries] = useState<CashEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    operation_type: 'in',
    category: '',
    amount: '',
    reference: '',
    notes: '',
  })

  const fetchEntries = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('cash_register')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setEntries(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchEntries()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('cash_register') as any).insert([{
      operation_type: formData.operation_type,
      category: formData.category || null,
      amount: parseFloat(formData.amount),
      reference: formData.reference || null,
      notes: formData.notes || null,
      transaction_date: new Date().toISOString().split('T')[0],
    }])

    if (!error) {
      fetchEntries()
      setIsDialogOpen(false)
      setFormData({
        operation_type: 'in',
        category: '',
        amount: '',
        reference: '',
        notes: '',
      })
    }
  }

  const totalIn = entries
    .filter(e => e.operation_type === 'in')
    .reduce((sum, e) => sum + e.amount, 0)

  const totalOut = entries
    .filter(e => e.operation_type === 'out')
    .reduce((sum, e) => sum + e.amount, 0)

  const balance = totalIn - totalOut

  const todayEntries = entries.filter(
    e => e.transaction_date === new Date().toISOString().split('T')[0]
  )

  const todayIn = todayEntries
    .filter(e => e.operation_type === 'in')
    .reduce((sum, e) => sum + e.amount, 0)

  const todayOut = todayEntries
    .filter(e => e.operation_type === 'out')
    .reduce((sum, e) => sum + e.amount, 0)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price)
  }

  return (
    <ProtectedModule module="caisse">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Caisse</h1>
            <p className="text-gray-500">Gérez votre trésorerie</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <ProtectedModule module="caisse" action="create">
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle opération
                </Button>
              </ProtectedModule>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouvelle opération de caisse</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Type d&apos;opération</Label>
                  <Select
                    value={formData.operation_type}
                    onValueChange={(value) => setFormData({ ...formData, operation_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrée</SelectItem>
                      <SelectItem value="out">Sortie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vente">Vente</SelectItem>
                      <SelectItem value="achat">Achat</SelectItem>
                      <SelectItem value="salaire">Salaire</SelectItem>
                      <SelectItem value="frais">Frais généraux</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Montant (DH) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Référence</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="N° facture, bon, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Description de l'opération"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700">
                    Enregistrer
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Solde actuel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Wallet className="h-8 w-8 text-green-600" />
                <span className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPrice(balance)}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Entrées du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-6 w-6 text-green-600" />
                <span className="text-2xl font-bold text-green-600">{formatPrice(todayIn)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Sorties du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="h-6 w-6 text-red-600" />
                <span className="text-2xl font-bold text-red-600">{formatPrice(todayOut)}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total opérations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{entries.length}</span>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historique des opérations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune opération pour le moment
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {format(new Date(entry.transaction_date), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge className={entry.operation_type === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {entry.operation_type === 'in' ? 'Entrée' : 'Sortie'}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{entry.category || '-'}</TableCell>
                      <TableCell>{entry.reference || '-'}</TableCell>
                      <TableCell className={`text-right font-medium ${entry.operation_type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.operation_type === 'in' ? '+' : '-'}{formatPrice(entry.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedModule>
  )
}
