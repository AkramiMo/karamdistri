'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Package,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Pencil,
  MoreHorizontal,
  XCircle,
  Check,
  ChevronsUpDown,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Composant séparé pour éviter la perte de focus
function NewTransporteurInput({
  onConfirm,
  onCancel
}: {
  onConfirm: (name: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState('')

  return (
    <div className="flex gap-2">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nom du nouveau transporteur"
        className="flex-1"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (value.trim()) {
              onConfirm(value.trim())
            }
          } else if (e.key === 'Escape') {
            onCancel()
          }
        }}
      />
      <Button
        type="button"
        size="sm"
        className="bg-green-600 hover:bg-green-700"
        onClick={() => {
          if (value.trim()) {
            onConfirm(value.trim())
          }
        }}
      >
        Confirmer
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onCancel}
      >
        Annuler
      </Button>
    </div>
  )
}

// Composant Input séparé pour éviter la perte de focus
function FormInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
  step,
  min,
  className
}: {
  id?: string
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  step?: string
  min?: string
  className?: string
}) {
  const [localValue, setLocalValue] = useState(String(value))

  useEffect(() => {
    setLocalValue(String(value))
  }, [value])

  return (
    <Input
      id={id}
      type={type}
      step={step}
      min={min}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onChange(localValue)}
      placeholder={placeholder}
      className={className}
    />
  )
}

interface SuiviLivraison {
  id: string
  date: string
  client_id: string | null
  client_name: string | null
  ville: string | null
  transporteur: string | null
  numero_bl: string | null
  numero_facture: string | null
  numero_envoi: string | null
  nombre_palettes_colis: string | null
  mode_paiement: string | null
  contre: string | null
  montant_ht: number
  recu: boolean
  indemnite: number
  notes: string | null
  created_at: string
  client?: { name: string; code: string }
}

const contreOptions: Record<string, string> = {
  bl: 'BL',
  facture: 'Facture',
  cheque: 'Chèque',
  espece: 'Espèce',
  virement: 'Virement',
  autre: 'Autre',
}

interface ClientWithCity {
  id: string
  code: string
  name: string
  city: string | null
}

interface Delivery {
  id: string
  delivery_number: string
  total_ht: number | null
}

interface Facture {
  id: string
  facture_number: string
  total_ht: number | null
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Espèces',
  cash_deposit: "Versement d'espèces",
  check: 'Chèque',
  transfer: 'Virement',
  card: 'Carte',
  credit: 'Crédit',
}

export default function SuiviLivraisonsPage() {
  const [suivis, setSuivis] = useState<SuiviLivraison[]>([])
  const [clients, setClients] = useState<ClientWithCity[]>([])
  const [transporteurs, setTransporteurs] = useState<string[]>([])
  const [clientDeliveries, setClientDeliveries] = useState<Delivery[]>([])
  const [clientFactures, setClientFactures] = useState<Facture[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSuiviDialogOpen, setIsSuiviDialogOpen] = useState(false)
  const [isEditSuiviDialogOpen, setIsEditSuiviDialogOpen] = useState(false)
  const [editingSuivi, setEditingSuivi] = useState<SuiviLivraison | null>(null)
  const [suiviSearchTerm, setSuiviSearchTerm] = useState('')
  const [selectedSuiviMonth, setSelectedSuiviMonth] = useState<string>('all')
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false)
  const [showNewTransporteur, setShowNewTransporteur] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [suiviFormData, setSuiviFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    client_id: '',
    client_name: '',
    ville: '',
    transporteur: '',
    numero_bl: '',
    numero_facture: '',
    numero_envoi: '',
    nombre_palettes_colis: '',
    mode_paiement: '',
    contre: '',
    montant_ht: 0,
    recu: false,
    indemnite: 0,
    notes: '',
  })

  const supabase = useSupabase()

  // Fetch clients with city
  const fetchClients = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, code, name, city')
      .eq('is_active', true)
      .order('name')
      .limit(500)

    if (data) {
      setClients(data as ClientWithCity[])
    }
  }, [supabase])

  // Fetch unique transporteurs from existing suivis
  const fetchTransporteurs = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('suivi_livraisons')
      .select('transporteur')
      .not('transporteur', 'is', null)
      .order('transporteur')

    if (data) {
      const unique = [...new Set(data.map((d: { transporteur: string }) => d.transporteur).filter(Boolean))] as string[]
      setTransporteurs(unique)
    }
  }, [supabase])

  // Fetch deliveries for selected client
  const fetchClientDeliveries = useCallback(async (clientId: string) => {
    if (!clientId) {
      setClientDeliveries([])
      return
    }

    const { data } = await supabase
      .from('deliveries')
      .select('id, delivery_number, total_ht')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) {
      setClientDeliveries(data as Delivery[])
    }
  }, [supabase])

  // Fetch factures for selected client
  const fetchClientFactures = useCallback(async (clientId: string) => {
    if (!clientId) {
      setClientFactures([])
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('factures')
      .select('id, facture_number, total_ht')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) {
      setClientFactures(data as Facture[])
    }
  }, [supabase])

  const fetchSuivis = useCallback(async () => {
    setIsLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('suivi_livraisons')
      .select(`
        *,
        client:clients(name, code)
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (selectedSuiviMonth !== 'all') {
      const startDate = `${selectedSuiviMonth}-01`
      const [year, month] = selectedSuiviMonth.split('-').map(Number)
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
      query = query.gte('date', startDate).lt('date', endDate)
    }

    const { data, error } = await query.limit(500)

    if (error) {
      console.error('Error fetching suivis:', error)
    } else {
      setSuivis((data as SuiviLivraison[]) || [])
    }
    setIsLoading(false)
  }, [supabase, selectedSuiviMonth])

  useEffect(() => {
    fetchClients()
    fetchSuivis()
    fetchTransporteurs()
  }, [fetchClients, fetchSuivis, fetchTransporteurs])

  // When client changes, fetch their deliveries and factures, and set ville
  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSuiviFormData({
      ...suiviFormData,
      client_id: clientId,
      client_name: client?.name || '',
      ville: client?.city || '',
      numero_bl: '',
      numero_facture: '',
    })
    fetchClientDeliveries(clientId)
    fetchClientFactures(clientId)
  }

  // When BL changes, update montant_ht
  const handleBLChange = (blNumber: string) => {
    const delivery = clientDeliveries.find(d => d.delivery_number === blNumber)
    setSuiviFormData({
      ...suiviFormData,
      numero_bl: blNumber,
      montant_ht: delivery?.total_ht || suiviFormData.montant_ht,
    })
  }

  const formatPrice = (price: number | null) => {
    if (price === null) return '-'
    const formatted = price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return `${formatted} MAD`
  }

  const filteredSuivis = suivis.filter((suivi) => {
    const searchLower = suiviSearchTerm.toLowerCase()
    return !suiviSearchTerm ||
      suivi.client_name?.toLowerCase().includes(searchLower) ||
      suivi.client?.name?.toLowerCase().includes(searchLower) ||
      suivi.transporteur?.toLowerCase().includes(searchLower) ||
      suivi.numero_bl?.toLowerCase().includes(searchLower) ||
      suivi.numero_facture?.toLowerCase().includes(searchLower) ||
      suivi.ville?.toLowerCase().includes(searchLower)
  })

  const resetForm = () => {
    setSuiviFormData({
      date: new Date().toISOString().split('T')[0],
      client_id: '',
      client_name: '',
      ville: '',
      transporteur: '',
      numero_bl: '',
      numero_facture: '',
      numero_envoi: '',
      nombre_palettes_colis: '',
      mode_paiement: '',
      contre: '',
      montant_ht: 0,
      recu: false,
      indemnite: 0,
      notes: '',
    })
    setClientDeliveries([])
    setClientFactures([])
    setClientSearchTerm('')
    setShowNewTransporteur(false)
    setClientPopoverOpen(false)
  }

  // Filter clients based on search term
  const filteredClients = clients.filter((client) => {
    if (!clientSearchTerm) return true
    const search = clientSearchTerm.toLowerCase()
    return (
      client.name.toLowerCase().includes(search) ||
      client.code.toLowerCase().includes(search) ||
      (client.city && client.city.toLowerCase().includes(search))
    )
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('suivi_livraisons')
      .insert([{
        date: suiviFormData.date,
        client_id: suiviFormData.client_id || null,
        client_name: suiviFormData.client_name || null,
        ville: suiviFormData.ville || null,
        transporteur: suiviFormData.transporteur || null,
        numero_bl: suiviFormData.numero_bl || null,
        numero_facture: suiviFormData.numero_facture || null,
        numero_envoi: suiviFormData.numero_envoi || null,
        nombre_palettes_colis: suiviFormData.nombre_palettes_colis || null,
        mode_paiement: suiviFormData.mode_paiement || null,
        contre: suiviFormData.contre || null,
        montant_ht: suiviFormData.montant_ht || 0,
        recu: suiviFormData.recu,
        indemnite: suiviFormData.indemnite || 0,
        notes: suiviFormData.notes || null,
      }])

    if (error) {
      console.error('Error creating suivi:', error)
      alert('Erreur lors de la creation du suivi: ' + error.message)
    } else {
      setIsSuiviDialogOpen(false)
      resetForm()
      fetchSuivis()
      fetchTransporteurs() // Refresh transporteurs list
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSuivi) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('suivi_livraisons')
      .update({
        date: suiviFormData.date,
        client_id: suiviFormData.client_id || null,
        client_name: suiviFormData.client_name || null,
        ville: suiviFormData.ville || null,
        transporteur: suiviFormData.transporteur || null,
        numero_bl: suiviFormData.numero_bl || null,
        numero_facture: suiviFormData.numero_facture || null,
        numero_envoi: suiviFormData.numero_envoi || null,
        nombre_palettes_colis: suiviFormData.nombre_palettes_colis || null,
        mode_paiement: suiviFormData.mode_paiement || null,
        contre: suiviFormData.contre || null,
        montant_ht: suiviFormData.montant_ht || 0,
        recu: suiviFormData.recu,
        indemnite: suiviFormData.indemnite || 0,
        notes: suiviFormData.notes || null,
      })
      .eq('id', editingSuivi.id)

    if (error) {
      console.error('Error updating suivi:', error)
      alert('Erreur lors de la modification du suivi: ' + error.message)
    } else {
      setIsEditSuiviDialogOpen(false)
      setEditingSuivi(null)
      resetForm()
      fetchSuivis()
      fetchTransporteurs()
    }
  }

  const SuiviForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <form onSubmit={isEdit ? handleEditSubmit : handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="suivi_date">Date *</Label>
          <Input
            id="suivi_date"
            type="date"
            value={suiviFormData.date}
            onChange={(e) => setSuiviFormData({ ...suiviFormData, date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Client</Label>
          <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={clientPopoverOpen}
                className="w-full justify-between font-normal"
              >
                {suiviFormData.client_id
                  ? clients.find((c) => c.id === suiviFormData.client_id)?.name || 'Client selectionne'
                  : 'Rechercher un client...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Tapez pour rechercher..."
                  value={clientSearchTerm}
                  onValueChange={setClientSearchTerm}
                />
                <CommandList>
                  <CommandEmpty>Aucun client trouve</CommandEmpty>
                  <CommandGroup>
                    {filteredClients.slice(0, 50).map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.id}
                        onSelect={() => {
                          handleClientChange(client.id)
                          setClientPopoverOpen(false)
                          setClientSearchTerm('')
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            suiviFormData.client_id === client.id ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        <span className="font-medium">{client.code}</span>
                        <span className="mx-2">-</span>
                        <span>{client.name}</span>
                        {client.city && (
                          <span className="ml-auto text-gray-500 text-sm">{client.city}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="suivi_ville">Ville</Label>
          <FormInput
            id="suivi_ville"
            value={suiviFormData.ville}
            onChange={(val) => setSuiviFormData({ ...suiviFormData, ville: val })}
            placeholder="Ville de destination"
          />
        </div>
        <div className="space-y-2">
          <Label>Transporteur</Label>
          {showNewTransporteur ? (
            <NewTransporteurInput
              onConfirm={(name) => {
                setSuiviFormData({ ...suiviFormData, transporteur: name })
                // Ajouter le nouveau transporteur à la liste locale s'il n'existe pas
                if (!transporteurs.includes(name)) {
                  setTransporteurs([...transporteurs, name].sort())
                }
                setShowNewTransporteur(false)
              }}
              onCancel={() => setShowNewTransporteur(false)}
            />
          ) : suiviFormData.transporteur && !transporteurs.includes(suiviFormData.transporteur) ? (
            <div className="flex gap-2 items-center">
              <div className="flex-1 px-3 py-2 border rounded-md bg-green-50 text-green-700 font-medium">
                {suiviFormData.transporteur}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSuiviFormData({ ...suiviFormData, transporteur: '' })}
              >
                Changer
              </Button>
            </div>
          ) : (
            <Select
              value={suiviFormData.transporteur}
              onValueChange={(value) => {
                if (value === '__new__') {
                  setShowNewTransporteur(true)
                } else {
                  setSuiviFormData({ ...suiviFormData, transporteur: value })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectionner un transporteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__" className="text-blue-600 font-medium">
                  + Nouveau transporteur
                </SelectItem>
                {transporteurs.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>N° BL</Label>
          {suiviFormData.client_id && clientDeliveries.length > 0 ? (
            <Select
              value={suiviFormData.numero_bl}
              onValueChange={handleBLChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectionner un BL" />
              </SelectTrigger>
              <SelectContent>
                {clientDeliveries.map((d) => (
                  <SelectItem key={d.id} value={d.delivery_number}>
                    {d.delivery_number} ({formatPrice(d.total_ht)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <FormInput
              value={suiviFormData.numero_bl}
              onChange={(val) => setSuiviFormData({ ...suiviFormData, numero_bl: val })}
              placeholder="Numero BL"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label>N° Facture</Label>
          {suiviFormData.client_id && clientFactures.length > 0 ? (
            <Select
              value={suiviFormData.numero_facture}
              onValueChange={(value) => setSuiviFormData({ ...suiviFormData, numero_facture: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectionner une facture" />
              </SelectTrigger>
              <SelectContent>
                {clientFactures.map((f) => (
                  <SelectItem key={f.id} value={f.facture_number}>
                    {f.facture_number} ({formatPrice(f.total_ht)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <FormInput
              value={suiviFormData.numero_facture}
              onChange={(val) => setSuiviFormData({ ...suiviFormData, numero_facture: val })}
              placeholder="Numero facture"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="suivi_envoi">N° d'envoi</Label>
          <FormInput
            id="suivi_envoi"
            value={suiviFormData.numero_envoi}
            onChange={(val) => setSuiviFormData({ ...suiviFormData, numero_envoi: val })}
            placeholder="Numero d'envoi"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="suivi_palettes">Nombre Palettes/Colis</Label>
          <FormInput
            id="suivi_palettes"
            value={suiviFormData.nombre_palettes_colis}
            onChange={(val) => setSuiviFormData({ ...suiviFormData, nombre_palettes_colis: val })}
            placeholder="Ex: 2 palettes, 5 colis"
          />
        </div>
        <div className="space-y-2">
          <Label>Mode de paiement</Label>
          <Select
            value={suiviFormData.mode_paiement}
            onValueChange={(value) => setSuiviFormData({ ...suiviFormData, mode_paiement: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Mode de paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Especes</SelectItem>
              <SelectItem value="check">Cheque</SelectItem>
              <SelectItem value="transfer">Virement</SelectItem>
              <SelectItem value="card">Carte</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Contre</Label>
          <Select
            value={suiviFormData.contre}
            onValueChange={(value) => setSuiviFormData({ ...suiviFormData, contre: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Contre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bl">BL</SelectItem>
              <SelectItem value="facture">Facture</SelectItem>
              <SelectItem value="cheque">Chèque</SelectItem>
              <SelectItem value="espece">Espèce</SelectItem>
              <SelectItem value="virement">Virement</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="suivi_montant">Montant HT</Label>
          <Input
            id="suivi_montant"
            type="number"
            step="0.01"
            min="0"
            value={suiviFormData.montant_ht}
            onChange={(e) => setSuiviFormData({ ...suiviFormData, montant_ht: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="suivi_indemnite">Indemnite</Label>
          <Input
            id="suivi_indemnite"
            type="number"
            step="0.01"
            min="0"
            value={suiviFormData.indemnite}
            onChange={(e) => setSuiviFormData({ ...suiviFormData, indemnite: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2 flex items-end">
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="suivi_recu"
              checked={suiviFormData.recu}
              onCheckedChange={(checked) => setSuiviFormData({ ...suiviFormData, recu: checked === true })}
              className="border-[#B8860B] data-[state=checked]:bg-[#B8860B]"
            />
            <Label htmlFor="suivi_recu" className="cursor-pointer">Recu</Label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="suivi_notes">Notes</Label>
        <FormInput
          id="suivi_notes"
          value={suiviFormData.notes}
          onChange={(val) => setSuiviFormData({ ...suiviFormData, notes: val })}
          placeholder="Notes supplementaires"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (isEdit) {
              setIsEditSuiviDialogOpen(false)
              setEditingSuivi(null)
            } else {
              setIsSuiviDialogOpen(false)
            }
            resetForm()
          }}
        >
          Annuler
        </Button>
        <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]">
          {isEdit ? 'Enregistrer' : 'Creer le suivi'}
        </Button>
      </div>
    </form>
  )

  return (
    <ProtectedModule module="suivi-livraisons">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suivi des Livraisons</h1>
            <p className="text-gray-500">Suivez vos expeditions avec transporteur</p>
          </div>
          <Dialog open={isSuiviDialogOpen} onOpenChange={(open) => {
            setIsSuiviDialogOpen(open)
            if (!open) resetForm()
          }}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#B8860B] hover:bg-[#9A7209]"
                onClick={() => {
                  resetForm()
                  setIsSuiviDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouveau Suivi
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouveau Suivi de Livraison</DialogTitle>
              </DialogHeader>
              <SuiviForm />
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">Total Suivis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-purple-600" />
                <span className="text-2xl font-bold">{suivis.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">Recus</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-[#B8860B]">
                {suivis.filter(s => s.recu).length}
              </span>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">En attente</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-orange-600">
                {suivis.filter(s => !s.recu).length}
              </span>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#B8860B]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-gray-600">Total HT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-[#B8860B]" />
                <span className="text-xl font-bold text-[#B8860B]">
                  {formatPrice(suivis.reduce((sum, s) => sum + (s.montant_ht || 0), 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-2 border-[#B8860B]">
          <CardHeader>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par client, transporteur, N° BL..."
                  value={suiviSearchTerm}
                  onChange={(e) => setSuiviSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-[#B8860B]"
                />
              </div>
              <Select value={selectedSuiviMonth} onValueChange={setSelectedSuiviMonth}>
                <SelectTrigger className="w-44 border-2 border-[#B8860B]">
                  <SelectValue placeholder="Mois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les mois</SelectItem>
                  {Array.from(new Set(suivis.map(s => s.date?.substring(0, 7)).filter(Boolean))).sort().reverse().map((month) => (
                    <SelectItem key={month} value={month!}>
                      {format(new Date(month + '-01'), 'MMMM yyyy', { locale: fr })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" onClick={fetchSuivis} title="Actualiser" className="bg-[#B8860B] hover:bg-[#9A7209]">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-500">Chargement...</p>
              </div>
            ) : filteredSuivis.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun suivi de livraison trouve
              </div>
            ) : (
              <div className="overflow-x-auto border-2 border-[#B8860B] rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Transporteur</TableHead>
                      <TableHead>N°BL</TableHead>
                      <TableHead>N° Facture</TableHead>
                      <TableHead>N° Envoi</TableHead>
                      <TableHead>Palettes/Colis</TableHead>
                      <TableHead>Mode Paiement</TableHead>
                      <TableHead>Contre</TableHead>
                      <TableHead className="text-right">Montant HT</TableHead>
                      <TableHead className="text-center">Recu</TableHead>
                      <TableHead className="text-right">Ind</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuivis.map((suivi) => (
                      <TableRow key={suivi.id}>
                        <TableCell>
                          {suivi.date ? format(new Date(suivi.date), 'dd/MM/yyyy', { locale: fr }) : '-'}
                        </TableCell>
                        <TableCell>{suivi.client?.name || suivi.client_name || '-'}</TableCell>
                        <TableCell>{suivi.ville || '-'}</TableCell>
                        <TableCell>{suivi.transporteur || '-'}</TableCell>
                        <TableCell className="font-mono">{suivi.numero_bl || '-'}</TableCell>
                        <TableCell className="font-mono">{suivi.numero_facture || '-'}</TableCell>
                        <TableCell className="font-mono">{suivi.numero_envoi || '-'}</TableCell>
                        <TableCell>{suivi.nombre_palettes_colis || '-'}</TableCell>
                        <TableCell>
                          {suivi.mode_paiement ? (
                            <Badge variant="outline">
                              {paymentMethodLabels[suivi.mode_paiement] || suivi.mode_paiement}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {suivi.contre ? (
                            <Badge variant="outline" className="bg-blue-50">
                              {contreOptions[suivi.contre] || suivi.contre}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPrice(suivi.montant_ht)}</TableCell>
                        <TableCell className="text-center">
                          {suivi.recu ? (
                            <CheckCircle2 className="h-5 w-5 text-[#B8860B] mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatPrice(suivi.indemnite)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingSuivi(suivi)
                                  setSuiviFormData({
                                    date: suivi.date || new Date().toISOString().split('T')[0],
                                    client_id: suivi.client_id || '',
                                    client_name: suivi.client_name || '',
                                    ville: suivi.ville || '',
                                    transporteur: suivi.transporteur || '',
                                    numero_bl: suivi.numero_bl || '',
                                    numero_facture: suivi.numero_facture || '',
                                    numero_envoi: suivi.numero_envoi || '',
                                    nombre_palettes_colis: suivi.nombre_palettes_colis || '',
                                    mode_paiement: suivi.mode_paiement || '',
                                    contre: suivi.contre || '',
                                    montant_ht: suivi.montant_ht || 0,
                                    recu: suivi.recu || false,
                                    indemnite: suivi.indemnite || 0,
                                    notes: suivi.notes || '',
                                  })
                                  if (suivi.client_id) {
                                    fetchClientDeliveries(suivi.client_id)
                                    fetchClientFactures(suivi.client_id)
                                  }
                                  setIsEditSuiviDialogOpen(true)
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  const newRecu = !suivi.recu
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  await (supabase as any)
                                    .from('suivi_livraisons')
                                    .update({ recu: newRecu })
                                    .eq('id', suivi.id)
                                  fetchSuivis()
                                }}
                              >
                                {suivi.recu ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Marquer non recu
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Marquer recu
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={async () => {
                                  if (confirm('Supprimer ce suivi ?')) {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    await (supabase as any)
                                      .from('suivi_livraisons')
                                      .delete()
                                      .eq('id', suivi.id)
                                    fetchSuivis()
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditSuiviDialogOpen} onOpenChange={(open) => {
          setIsEditSuiviDialogOpen(open)
          if (!open) {
            setEditingSuivi(null)
            resetForm()
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le Suivi</DialogTitle>
            </DialogHeader>
            <SuiviForm isEdit />
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedModule>
  )
}
