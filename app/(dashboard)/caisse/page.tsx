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
import { Plus, Wallet, ArrowUpCircle, ArrowDownCircle, ChevronDown, ChevronRight, Calendar, CalendarDays } from 'lucide-react'
import { format, startOfWeek, startOfMonth, isWithinInterval, endOfWeek, endOfMonth, getWeek, getYear, getMonth } from 'date-fns'
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
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
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

  // Calcul des entrées/sorties de la semaine
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Lundi
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const weekEntries = entries.filter(e => {
    const entryDate = new Date(e.transaction_date)
    return isWithinInterval(entryDate, { start: weekStart, end: weekEnd })
  })

  const weekIn = weekEntries
    .filter(e => e.operation_type === 'in')
    .reduce((sum, e) => sum + e.amount, 0)

  const weekOut = weekEntries
    .filter(e => e.operation_type === 'out')
    .reduce((sum, e) => sum + e.amount, 0)

  // Calcul des entrées/sorties du mois
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const monthEntries = entries.filter(e => {
    const entryDate = new Date(e.transaction_date)
    return isWithinInterval(entryDate, { start: monthStart, end: monthEnd })
  })

  const monthIn = monthEntries
    .filter(e => e.operation_type === 'in')
    .reduce((sum, e) => sum + e.amount, 0)

  const monthOut = monthEntries
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

          <ProtectedModule module="caisse" action="create">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#B8860B] hover:bg-[#9A7209]">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle opération
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
                    Enregistrer
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </ProtectedModule>
        </div>

        {/* Solde actuel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Solde actuel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Wallet className="h-8 w-8 text-[#B8860B]" />
                <span className={`text-2xl font-bold ${balance >= 0 ? 'text-[#B8860B]' : 'text-red-600'}`}>
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
                <ArrowUpCircle className="h-6 w-6 text-[#B8860B]" />
                <span className="text-2xl font-bold text-[#B8860B]">{formatPrice(todayIn)}</span>
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

        {/* Soldes par semaine et mois */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Semaine */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-2 bg-blue-50">
              <CardTitle className="text-sm font-bold text-blue-800">
                Cette semaine ({format(weekStart, 'dd/MM', { locale: fr })} - {format(weekEnd, 'dd/MM', { locale: fr })})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
                    <ArrowUpCircle className="h-4 w-4" />
                    Entrées
                  </div>
                  <p className="text-xl font-bold text-green-700">{formatPrice(weekIn)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-700 text-sm mb-1">
                    <ArrowDownCircle className="h-4 w-4" />
                    Sorties
                  </div>
                  <p className="text-xl font-bold text-red-700">{formatPrice(weekOut)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Solde semaine</span>
                  <span className={`text-xl font-bold ${weekIn - weekOut >= 0 ? 'text-[#B8860B]' : 'text-red-600'}`}>
                    {formatPrice(weekIn - weekOut)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mois */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="pb-2 bg-purple-50">
              <CardTitle className="text-sm font-bold text-purple-800">
                Ce mois ({format(monthStart, 'MMMM yyyy', { locale: fr })})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
                    <ArrowUpCircle className="h-4 w-4" />
                    Entrées
                  </div>
                  <p className="text-xl font-bold text-green-700">{formatPrice(monthIn)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-700 text-sm mb-1">
                    <ArrowDownCircle className="h-4 w-4" />
                    Sorties
                  </div>
                  <p className="text-xl font-bold text-red-700">{formatPrice(monthOut)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Solde mois</span>
                  <span className={`text-xl font-bold ${monthIn - monthOut >= 0 ? 'text-[#B8860B]' : 'text-red-600'}`}>
                    {formatPrice(monthIn - monthOut)}
                  </span>
                </div>
              </div>
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
              <div className="space-y-2">
                {(() => {
                  // Grouper par mois
                  const groupedByMonth: Record<string, CashEntry[]> = {}
                  entries.forEach(entry => {
                    const date = new Date(entry.transaction_date)
                    const monthKey = `${getYear(date)}-${String(getMonth(date) + 1).padStart(2, '0')}`
                    if (!groupedByMonth[monthKey]) {
                      groupedByMonth[monthKey] = []
                    }
                    groupedByMonth[monthKey].push(entry)
                  })

                  // Trier les mois (plus récent en premier)
                  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a))

                  return sortedMonths.map(monthKey => {
                    const monthEntries = groupedByMonth[monthKey]
                    const [year, month] = monthKey.split('-').map(Number)
                    const monthDate = new Date(year, month - 1, 1)
                    const isMonthExpanded = expandedMonths.has(monthKey)

                    // Calcul des totaux du mois
                    const monthTotalIn = monthEntries.filter(e => e.operation_type === 'in').reduce((sum, e) => sum + e.amount, 0)
                    const monthTotalOut = monthEntries.filter(e => e.operation_type === 'out').reduce((sum, e) => sum + e.amount, 0)

                    // Grouper par semaine
                    const groupedByWeek: Record<string, CashEntry[]> = {}
                    monthEntries.forEach(entry => {
                      const date = new Date(entry.transaction_date)
                      const weekNum = getWeek(date, { weekStartsOn: 1 })
                      const weekKey = `${monthKey}-W${weekNum}`
                      if (!groupedByWeek[weekKey]) {
                        groupedByWeek[weekKey] = []
                      }
                      groupedByWeek[weekKey].push(entry)
                    })

                    const sortedWeeks = Object.keys(groupedByWeek).sort((a, b) => b.localeCompare(a))

                    return (
                      <div key={monthKey} className="border rounded-lg overflow-hidden">
                        {/* Mois Header */}
                        <button
                          onClick={() => {
                            setExpandedMonths(prev => {
                              const next = new Set(prev)
                              if (next.has(monthKey)) {
                                next.delete(monthKey)
                              } else {
                                next.add(monthKey)
                              }
                              return next
                            })
                          }}
                          className="w-full flex items-center justify-between p-4 bg-purple-50 hover:bg-purple-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {isMonthExpanded ? (
                              <ChevronDown className="h-5 w-5 text-purple-700" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-purple-700" />
                            )}
                            <Calendar className="h-5 w-5 text-purple-700" />
                            <span className="font-bold text-purple-800 capitalize">
                              {format(monthDate, 'MMMM yyyy', { locale: fr })}
                            </span>
                            <Badge variant="outline" className="ml-2">
                              {monthEntries.length} opération(s)
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-green-700 font-semibold">+{formatPrice(monthTotalIn)}</span>
                            <span className="text-red-600 font-semibold">-{formatPrice(monthTotalOut)}</span>
                            <span className={`font-bold ${monthTotalIn - monthTotalOut >= 0 ? 'text-[#B8860B]' : 'text-red-600'}`}>
                              = {formatPrice(monthTotalIn - monthTotalOut)}
                            </span>
                          </div>
                        </button>

                        {/* Mois Content */}
                        {isMonthExpanded && (
                          <div className="border-t">
                            {sortedWeeks.map(weekKey => {
                              const weekEntries = groupedByWeek[weekKey]
                              const weekNum = weekKey.split('-W')[1]
                              const isWeekExpanded = expandedWeeks.has(weekKey)

                              // Calcul des totaux de la semaine
                              const weekTotalIn = weekEntries.filter(e => e.operation_type === 'in').reduce((sum, e) => sum + e.amount, 0)
                              const weekTotalOut = weekEntries.filter(e => e.operation_type === 'out').reduce((sum, e) => sum + e.amount, 0)

                              // Grouper par jour
                              const groupedByDay: Record<string, CashEntry[]> = {}
                              weekEntries.forEach(entry => {
                                const dayKey = entry.transaction_date
                                if (!groupedByDay[dayKey]) {
                                  groupedByDay[dayKey] = []
                                }
                                groupedByDay[dayKey].push(entry)
                              })

                              const sortedDays = Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a))

                              return (
                                <div key={weekKey} className="border-b last:border-b-0">
                                  {/* Semaine Header */}
                                  <button
                                    onClick={() => {
                                      setExpandedWeeks(prev => {
                                        const next = new Set(prev)
                                        if (next.has(weekKey)) {
                                          next.delete(weekKey)
                                        } else {
                                          next.add(weekKey)
                                        }
                                        return next
                                      })
                                    }}
                                    className="w-full flex items-center justify-between p-3 pl-8 bg-blue-50 hover:bg-blue-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      {isWeekExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-blue-700" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-blue-700" />
                                      )}
                                      <CalendarDays className="h-4 w-4 text-blue-700" />
                                      <span className="font-semibold text-blue-800">
                                        Semaine {weekNum}
                                      </span>
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {weekEntries.length} op.
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                      <span className="text-green-700">+{formatPrice(weekTotalIn)}</span>
                                      <span className="text-red-600">-{formatPrice(weekTotalOut)}</span>
                                    </div>
                                  </button>

                                  {/* Semaine Content */}
                                  {isWeekExpanded && (
                                    <div className="bg-white">
                                      {sortedDays.map(dayKey => {
                                        const dayEntries = groupedByDay[dayKey]
                                        const dayDate = new Date(dayKey)
                                        const isDayExpanded = expandedDays.has(dayKey)

                                        // Calcul des totaux du jour
                                        const dayTotalIn = dayEntries.filter(e => e.operation_type === 'in').reduce((sum, e) => sum + e.amount, 0)
                                        const dayTotalOut = dayEntries.filter(e => e.operation_type === 'out').reduce((sum, e) => sum + e.amount, 0)

                                        return (
                                          <div key={dayKey} className="border-b last:border-b-0">
                                            {/* Jour Header */}
                                            <button
                                              onClick={() => {
                                                setExpandedDays(prev => {
                                                  const next = new Set(prev)
                                                  if (next.has(dayKey)) {
                                                    next.delete(dayKey)
                                                  } else {
                                                    next.add(dayKey)
                                                  }
                                                  return next
                                                })
                                              }}
                                              className="w-full flex items-center justify-between p-2 pl-14 bg-gray-50 hover:bg-gray-100 transition-colors"
                                            >
                                              <div className="flex items-center gap-2">
                                                {isDayExpanded ? (
                                                  <ChevronDown className="h-4 w-4 text-gray-600" />
                                                ) : (
                                                  <ChevronRight className="h-4 w-4 text-gray-600" />
                                                )}
                                                <span className="font-medium text-gray-700">
                                                  {format(dayDate, 'EEEE dd MMMM', { locale: fr })}
                                                </span>
                                                <Badge variant="outline" className="ml-2 text-xs">
                                                  {dayEntries.length}
                                                </Badge>
                                              </div>
                                              <div className="flex items-center gap-3 text-sm">
                                                {dayTotalIn > 0 && <span className="text-green-700">+{formatPrice(dayTotalIn)}</span>}
                                                {dayTotalOut > 0 && <span className="text-red-600">-{formatPrice(dayTotalOut)}</span>}
                                              </div>
                                            </button>

                                            {/* Jour Content - Table des entrées */}
                                            {isDayExpanded && (
                                              <div className="pl-14 pr-4 pb-2">
                                                <Table>
                                                  <TableHeader>
                                                    <TableRow>
                                                      <TableHead>Type</TableHead>
                                                      <TableHead>Catégorie</TableHead>
                                                      <TableHead>Référence</TableHead>
                                                      <TableHead>Notes</TableHead>
                                                      <TableHead className="text-right">Montant</TableHead>
                                                    </TableRow>
                                                  </TableHeader>
                                                  <TableBody>
                                                    {dayEntries.map((entry) => (
                                                      <TableRow key={entry.id}>
                                                        <TableCell>
                                                          <Badge className={entry.operation_type === 'in' ? 'bg-amber-100 text-[#9A7209]' : 'bg-red-100 text-red-800'}>
                                                            {entry.operation_type === 'in' ? 'Entrée' : 'Sortie'}
                                                          </Badge>
                                                        </TableCell>
                                                        <TableCell className="capitalize">{entry.category || '-'}</TableCell>
                                                        <TableCell>{entry.reference || '-'}</TableCell>
                                                        <TableCell className="text-gray-500 text-sm">{entry.notes || '-'}</TableCell>
                                                        <TableCell className={`text-right font-medium ${entry.operation_type === 'in' ? 'text-[#B8860B]' : 'text-red-600'}`}>
                                                          {entry.operation_type === 'in' ? '+' : '-'}{formatPrice(entry.amount)}
                                                        </TableCell>
                                                      </TableRow>
                                                    ))}
                                                  </TableBody>
                                                </Table>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedModule>
  )
}
