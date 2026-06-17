// @ts-nocheck
'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'

// Import map component dynamically to avoid SSR issues with Leaflet
const RouteMap = dynamic(
  () => import('@/components/maps/RouteMap').then(mod => mod.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg h-[400px]">
        <div className="text-gray-500">Chargement de la carte...</div>
      </div>
    )
  }
)
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Eye,
  Trash2,
  MoreHorizontal,
  FileText,
  Calendar,
  User,
  Truck,
  RefreshCw,
  Package,
  MapPin,
  Phone,
  Navigation,
  Route,
  Maximize2,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { useAuth } from '@/hooks/useAuth'

interface FicheTrajet {
  id: string
  ft_number: string
  ft_date: string
  round_id: string | null
  driver_id: string | null
  notes: string | null
  created_at: string
  round?: {
    id: string
    round_number: string
    round_date: string
    status: string
    driver?: {
      id: string
      full_name: string
      email: string
    }
    delivery_round_items?: {
      id: string
      delivery_id: string
      sequence_order: number
      delivery?: {
        id: string
        delivery_number: string
        client?: {
          code: string
          name: string
          city: string | null
          phone: string | null
          gps_lat: number | null
          gps_lng: number | null
        }
        total_ht: number | null
      }
    }[]
  }
  driver?: {
    id: string
    full_name: string
    email: string
  }
}

interface Driver {
  id: string
  full_name: string
  email: string
}

interface DeliveryRound {
  id: string
  round_number: string
  round_date: string
  status: string
  driver_id: string | null
  driver?: {
    full_name: string
  }
}

const roundStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-amber-100 text-[#9A7209]',
  cancelled: 'bg-red-100 text-red-800',
}

const roundStatusLabels: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminee',
  cancelled: 'Annulee',
}

// Haversine formula to calculate distance between two GPS coordinates (in km)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

interface DeliveryPoint {
  id: string
  delivery_id: string
  lat: number | null
  lng: number | null
  clientName: string
}

// Nearest neighbor algorithm to find optimal route
function optimizeRoute(
  points: DeliveryPoint[],
  depotLat: number | null,
  depotLng: number | null
): DeliveryPoint[] {
  // Filter points with valid GPS coordinates
  const validPoints = points.filter(p => p.lat !== null && p.lng !== null)
  const invalidPoints = points.filter(p => p.lat === null || p.lng === null)

  if (validPoints.length === 0) {
    return points // Return original order if no GPS data
  }

  const optimized: DeliveryPoint[] = []
  const remaining = [...validPoints]

  // Start from depot if available, otherwise start from first point
  let currentLat = depotLat ?? validPoints[0].lat!
  let currentLng = depotLng ?? validPoints[0].lng!

  while (remaining.length > 0) {
    let nearestIndex = 0
    let nearestDistance = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const point = remaining[i]
      const distance = calculateDistance(currentLat, currentLng, point.lat!, point.lng!)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    const nearest = remaining.splice(nearestIndex, 1)[0]
    optimized.push(nearest)
    currentLat = nearest.lat!
    currentLng = nearest.lng!
  }

  // Add points without GPS at the end
  return [...optimized, ...invalidPoints]
}

export default function FichesTrajetPage() {
  const [fichesTrajet, setFichesTrajet] = useState<FicheTrajet[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [availableRounds, setAvailableRounds] = useState<DeliveryRound[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingFiche, setViewingFiche] = useState<FicheTrajet | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)
  const [viewingDeliveryId, setViewingDeliveryId] = useState<string | null>(null)
  const [viewingDelivery, setViewingDelivery] = useState<any | null>(null)
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false)
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false)
  const supabase = createClient()
  const { companySettings } = useCompanySettings()
  const { profile } = useAuth()
  const isLivreur = profile?.role?.name === 'livreur'

  const [formData, setFormData] = useState({
    round_id: '',
    driver_id: '',
    ft_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const fetchFichesTrajet = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('fiches_trajet')
      .select(`
        *,
        driver:users!fiches_trajet_driver_id_fkey(id, full_name, email),
        round:delivery_rounds!fiches_trajet_round_id_fkey(
          id,
          round_number,
          round_date,
          status,
          driver:users!delivery_rounds_driver_id_fkey(id, full_name, email),
          delivery_round_items(
            id,
            delivery_id,
            sequence_order,
            delivery:deliveries(
              id,
              delivery_number,
              total_ht,
              client:clients(code, name, city, phone, gps_lat, gps_lng)
            )
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching fiches trajet:', error)
    } else {
      setFichesTrajet(data || [])
    }
    setIsLoading(false)
  }, [supabase])

  const fetchDrivers = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('is_active', true)
      .order('full_name')
    setDrivers(data || [])
  }, [supabase])

  const fetchAvailableRounds = useCallback(async () => {
    const { data } = await supabase
      .from('delivery_rounds')
      .select(`
        id,
        round_number,
        round_date,
        status,
        driver_id,
        driver:users!delivery_rounds_driver_id_fkey(full_name)
      `)
      .order('round_date', { ascending: false })
      .limit(50)

    setAvailableRounds(data || [])
  }, [supabase])

  useEffect(() => {
    fetchFichesTrajet()
    fetchDrivers()
    fetchAvailableRounds()
  }, [fetchFichesTrajet, fetchDrivers, fetchAvailableRounds])

  const generateFTNumber = async (): Promise<string> => {
    const { data } = await supabase
      .from('fiches_trajet')
      .select('ft_number')
      .like('ft_number', 'FT%')
      .order('ft_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].ft_number.replace('FT', ''))
      if (!isNaN(lastNum)) {
        return `FT${String(lastNum + 1).padStart(4, '0')}`
      }
    }
    return 'FT0001'
  }

  // Fetch delivery details for BL detail dialog
  const fetchDeliveryDetails = async (deliveryId: string) => {
    setIsLoadingDelivery(true)
    setViewingDeliveryId(deliveryId)
    setIsDeliveryDialogOpen(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('deliveries') as any)
      .select(`
        *,
        client:clients(code, name, address, city, phone, email, gps_lat, gps_lng),
        delivery_items(
          id,
          article_id,
          quantity_ordered,
          quantity_delivered,
          quantity_returned,
          unit_price,
          article:articles(code, name)
        )
      `)
      .eq('id', deliveryId)
      .single()

    if (error) {
      console.error('Error fetching delivery:', error)
    } else {
      setViewingDelivery(data)
    }
    setIsLoadingDelivery(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.round_id) {
      alert('Veuillez selectionner un BLT')
      return
    }

    setIsOptimizing(true)

    try {
      // Fetch delivery_round_items with client GPS coordinates
      const { data: roundItems, error: fetchError } = await supabase
        .from('delivery_round_items')
        .select(`
          id,
          delivery_id,
          delivery:deliveries(
            client:clients(name, gps_lat, gps_lng)
          )
        `)
        .eq('round_id', formData.round_id)

      if (fetchError) {
        console.error('Error fetching round items:', fetchError)
        alert(`Erreur: ${fetchError.message}`)
        setIsOptimizing(false)
        return
      }

      // Prepare points for optimization
      const points: DeliveryPoint[] = (roundItems || []).map((item: any) => ({
        id: item.id,
        delivery_id: item.delivery_id,
        lat: item.delivery?.client?.gps_lat || null,
        lng: item.delivery?.client?.gps_lng || null,
        clientName: item.delivery?.client?.name || '',
      }))

      // Optimize route using nearest neighbor algorithm
      const optimizedPoints = optimizeRoute(
        points,
        companySettings?.depot_lat || null,
        companySettings?.depot_lng || null
      )

      // Update sequence_order for each delivery_round_item
      for (let i = 0; i < optimizedPoints.length; i++) {
        const { error: updateError } = await supabase
          .from('delivery_round_items')
          .update({ sequence_order: i + 1 })
          .eq('id', optimizedPoints[i].id)

        if (updateError) {
          console.error('Error updating sequence:', updateError)
        }
      }

      // Generate FT number and create the fiche
      const ftNumber = await generateFTNumber()

      const { error } = await supabase
        .from('fiches_trajet')
        .insert([{
          ft_number: ftNumber,
          ft_date: formData.ft_date,
          round_id: formData.round_id,
          driver_id: formData.driver_id && formData.driver_id !== 'none' ? formData.driver_id : null,
          notes: formData.notes || null,
        }])

      if (error) {
        console.error('Error creating fiche trajet:', error)
        alert(`Erreur: ${error.message}`)
        setIsOptimizing(false)
        return
      }

      const pointsWithGPS = points.filter(p => p.lat !== null && p.lng !== null).length
      const totalPoints = points.length

      fetchFichesTrajet()
      setIsDialogOpen(false)
      resetForm()

      // Show success message with optimization info
      alert(`Fiche de trajet ${ftNumber} creee avec succes!\n\nItineraire optimise: ${pointsWithGPS}/${totalPoints} clients avec GPS ont ete classes par ordre de passage optimal.`)
    } catch (err) {
      console.error('Error:', err)
      alert('Une erreur est survenue')
    } finally {
      setIsOptimizing(false)
    }
  }

  const handleDelete = async (id: string, ftNumber: string) => {
    if (!confirm(`Etes-vous sur de vouloir supprimer la fiche ${ftNumber} ?`)) return

    const { error } = await supabase
      .from('fiches_trajet')
      .delete()
      .eq('id', id)

    if (error) {
      alert(`Erreur: ${error.message}`)
    } else {
      fetchFichesTrajet()
    }
  }

  const handleViewFiche = (fiche: FicheTrajet) => {
    setViewingFiche(fiche)
    setIsViewDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      round_id: '',
      driver_id: '',
      ft_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
  }

  const filteredFiches = fichesTrajet.filter((fiche) => {
    const matchesSearch =
      fiche.ft_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fiche.round?.round_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fiche.driver?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const formatPrice = (price: number | null) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(price || 0)
  }

  // Stats
  const stats = {
    total: fichesTrajet.length,
    thisMonth: fichesTrajet.filter(f => {
      const date = new Date(f.ft_date)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length,
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fiche de Trajet - FT</h1>
            <p className="text-gray-500">Gerez vos fiches de trajet</p>
          </div>

          {!isLivreur && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <ProtectedModule module="fiches-trajet" action="create">
                  <Button
                    className="bg-[#B8860B] hover:bg-[#9A7209]"
                    onClick={() => {
                      resetForm()
                      setIsDialogOpen(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Fiche
                  </Button>
                </ProtectedModule>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-[#B8860B]" />
                  Creer une nouvelle fiche de trajet
                </DialogTitle>
                <p className="text-sm text-gray-500">
                  L&apos;itineraire sera automatiquement optimise pour trouver le chemin le plus court entre les clients.
                </p>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ft_date">Date</Label>
                    <Input
                      id="ft_date"
                      type="date"
                      value={formData.ft_date}
                      onChange={(e) => setFormData({ ...formData, ft_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Livreur</Label>
                    <Select
                      value={formData.driver_id}
                      onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner un livreur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Non assigne</SelectItem>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.full_name || driver.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>BLT (Bon de Livraison Tournee)</Label>
                  <Select
                    value={formData.round_id}
                    onValueChange={(value) => setFormData({ ...formData, round_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un BLT" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRounds.map((round) => (
                        <SelectItem key={round.id} value={round.id}>
                          {round.round_number} - {format(new Date(round.round_date), 'dd/MM/yyyy')}
                          {round.driver?.full_name && ` (${round.driver.full_name})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes sur la fiche de trajet"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isOptimizing}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-[#B8860B] hover:bg-[#9A7209]" disabled={isOptimizing}>
                    {isOptimizing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Optimisation du trajet...
                      </>
                    ) : (
                      <>
                        <Navigation className="mr-2 h-4 w-4" />
                        Creer et optimiser le trajet
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Fiches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-8 w-8 text-[#B8860B]" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Ce mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-[#B8860B]">{stats.thisMonth}</span>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par N° FT, N° BLT ou livreur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchFichesTrajet}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : filteredFiches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune fiche de trajet trouvee
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>N° FT</TableHead>
                      <TableHead>N° BLT</TableHead>
                      <TableHead>Livreur</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFiches.map((fiche) => (
                      <TableRow key={fiche.id}>
                        <TableCell>
                          {format(new Date(fiche.ft_date), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {fiche.ft_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{fiche.round?.round_number || '-'}</span>
                            {fiche.round?.status && (
                              <Badge className={roundStatusColors[fiche.round.status]}>
                                {roundStatusLabels[fiche.round.status]}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {fiche.driver?.full_name || 'Non assigne'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewFiche(fiche)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Voir detail
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(fiche.id, fiche.ft_number)}
                                className="text-red-600"
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

        {/* View Fiche Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <FileText className="h-6 w-6 text-[#B8860B]" />
                Fiche de Trajet {viewingFiche?.ft_number}
              </DialogTitle>
            </DialogHeader>
            {viewingFiche && (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Calendar className="h-4 w-4" />
                      Date FT
                    </div>
                    <p className="font-medium">
                      {format(new Date(viewingFiche.ft_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-[#B8860B] rounded-lg p-3">
                    <div className="flex items-center gap-2 text-[#B8860B] text-sm mb-1">
                      <User className="h-4 w-4" />
                      Livreur BLT
                    </div>
                    <p className="font-semibold text-[#B8860B]">
                      {viewingFiche.round?.driver?.full_name || 'Non assigne'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Truck className="h-4 w-4" />
                      N° BLT
                    </div>
                    <p className="font-medium">
                      {viewingFiche.round?.round_number || '-'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Package className="h-4 w-4" />
                      Livraisons
                    </div>
                    <p className="font-medium">
                      {viewingFiche.round?.delivery_round_items?.length || 0} BL
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
                      <Route className="h-4 w-4" />
                      Distance totale
                    </div>
                    <p className="font-semibold text-blue-600">
                      {(() => {
                        const items = viewingFiche.round?.delivery_round_items
                          ?.filter(item => item.delivery?.client?.gps_lat && item.delivery?.client?.gps_lng)
                          .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)) || []

                        if (items.length < 2) return '- km'

                        let totalDistance = 0
                        // Add distance from depot if available
                        if (companySettings?.depot_lat && companySettings?.depot_lng && items[0]) {
                          totalDistance += calculateDistance(
                            companySettings.depot_lat,
                            companySettings.depot_lng,
                            items[0].delivery!.client!.gps_lat!,
                            items[0].delivery!.client!.gps_lng!
                          )
                        }
                        // Calculate distance between consecutive stops
                        for (let i = 0; i < items.length - 1; i++) {
                          const current = items[i]
                          const next = items[i + 1]
                          totalDistance += calculateDistance(
                            current.delivery!.client!.gps_lat!,
                            current.delivery!.client!.gps_lng!,
                            next.delivery!.client!.gps_lat!,
                            next.delivery!.client!.gps_lng!
                          )
                        }
                        return `~${totalDistance.toFixed(1)} km`
                      })()}
                    </p>
                  </div>
                </div>

                {/* BLT Details */}
                {viewingFiche.round && (
                  <div className="border rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Details du BLT
                        {viewingFiche.round.status && (
                          <Badge className={roundStatusColors[viewingFiche.round.status]}>
                            {roundStatusLabels[viewingFiche.round.status]}
                          </Badge>
                        )}
                      </h3>
                    </div>
                    {viewingFiche.round.delivery_round_items && viewingFiche.round.delivery_round_items.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="w-16">Ordre</TableHead>
                            <TableHead>N° BL</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Telephone</TableHead>
                            <TableHead>GPS</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingFiche.round.delivery_round_items
                            .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
                            .map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-bold text-gray-500">
                                {item.sequence_order || index + 1}
                              </TableCell>
                              <TableCell className="font-mono font-medium">
                                {item.delivery?.delivery_number || '-'}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{item.delivery?.client?.code}</span>
                                  <span className="text-gray-500 ml-2">{item.delivery?.client?.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.delivery?.client?.phone ? (
                                  <a
                                    href={`tel:${item.delivery.client.phone}`}
                                    className="flex items-center gap-1 text-blue-600 hover:underline"
                                  >
                                    <Phone className="h-3 w-3" />
                                    {item.delivery.client.phone}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {item.delivery?.client?.gps_lat && item.delivery?.client?.gps_lng ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-blue-600 p-0 h-auto"
                                    onClick={() => window.open(
                                      `https://www.google.com/maps?q=${item.delivery?.client?.gps_lat},${item.delivery?.client?.gps_lng}`,
                                      '_blank'
                                    )}
                                  >
                                    <Navigation className="h-4 w-4 mr-1" />
                                    Voir
                                  </Button>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[#B8860B] border-[#B8860B] hover:bg-[#B8860B] hover:text-white"
                                  onClick={() => fetchDeliveryDetails(item.delivery_id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Voir detail BL
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Aucune livraison dans ce BLT
                      </div>
                    )}
                  </div>
                )}

                {/* Map Section */}
                {viewingFiche.round?.delivery_round_items && viewingFiche.round.delivery_round_items.length > 0 && (
                  <div className="border rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                      <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-[#B8860B]" />
                        Carte du trajet
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsMapFullscreen(true)}
                        className="text-gray-600 hover:text-[#B8860B]"
                      >
                        <Maximize2 className="h-4 w-4 mr-1" />
                        Plein écran
                      </Button>
                    </div>
                    <div className="p-4">
                      <RouteMap
                        points={viewingFiche.round.delivery_round_items
                          .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
                          .map((item, index) => ({
                            lat: item.delivery?.client?.gps_lat || 0,
                            lng: item.delivery?.client?.gps_lng || 0,
                            label: `${item.delivery?.client?.code || ''} - ${item.delivery?.client?.name || ''}`,
                            order: item.sequence_order || index + 1
                          }))
                          .filter(p => p.lat !== 0 && p.lng !== 0)
                        }
                        depot={companySettings?.depot_lat && companySettings?.depot_lng ? {
                          lat: companySettings.depot_lat,
                          lng: companySettings.depot_lng
                        } : null}
                        height="400px"
                      />
                      <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center border-2 border-white shadow">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            </svg>
                          </div>
                          <span>Depot</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow">
                            1
                          </div>
                          <span>Ordre de passage</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-1.5 bg-blue-500 rounded shadow"></div>
                          <span>Itineraire routier</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {viewingFiche.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">Notes</h3>
                    <p className="text-sm text-gray-700">{viewingFiche.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Fermer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Fullscreen Map Modal */}
        {isMapFullscreen && viewingFiche?.round?.delivery_round_items && (
          <div className="fixed inset-0 z-[9999] bg-black">
            <div className="absolute top-4 right-4 z-[10000]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsMapFullscreen(false)}
                className="bg-white hover:bg-gray-100 shadow-lg"
              >
                <X className="h-4 w-4 mr-1" />
                Fermer
              </Button>
            </div>
            <div className="absolute top-4 left-4 z-[10000] bg-white rounded-lg shadow-lg px-4 py-2">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#B8860B]" />
                Carte du trajet - {viewingFiche.ft_number}
              </h3>
            </div>
            <RouteMap
              points={viewingFiche.round.delivery_round_items
                .sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))
                .map((item, index) => ({
                  lat: item.delivery?.client?.gps_lat || 0,
                  lng: item.delivery?.client?.gps_lng || 0,
                  label: `${item.delivery?.client?.code || ''} - ${item.delivery?.client?.name || ''}`,
                  order: item.sequence_order || index + 1
                }))
                .filter(p => p.lat !== 0 && p.lng !== 0)
              }
              depot={companySettings?.depot_lat && companySettings?.depot_lng ? {
                lat: companySettings.depot_lat,
                lng: companySettings.depot_lng
              } : null}
              height="100vh"
            />
            <div className="absolute bottom-4 left-4 z-[10000] bg-white rounded-lg shadow-lg px-4 py-3">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center border-2 border-white shadow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                  </div>
                  <span>Depot</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow">
                    1
                  </div>
                  <span>Ordre de passage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-1.5 bg-blue-500 rounded shadow"></div>
                  <span>Itineraire routier</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Detail Dialog */}
        <Dialog open={isDeliveryDialogOpen} onOpenChange={setIsDeliveryDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#B8860B]" />
                Détail du Bon de Livraison
              </DialogTitle>
            </DialogHeader>
            {isLoadingDelivery ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-[#B8860B]" />
              </div>
            ) : viewingDelivery ? (
              <div className="space-y-4">
                {/* BL Header */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">N° BL</p>
                    <p className="font-semibold text-lg">{viewingDelivery.delivery_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">
                      {format(new Date(viewingDelivery.delivery_date), 'dd/MM/yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Statut</p>
                    <Badge className={
                      viewingDelivery.status === 'completed' ? 'bg-green-100 text-green-800' :
                      viewingDelivery.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      viewingDelivery.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {viewingDelivery.status === 'completed' ? 'Livré' :
                       viewingDelivery.status === 'in_progress' ? 'En cours' :
                       viewingDelivery.status === 'pending' ? 'En attente' :
                       viewingDelivery.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total HT</p>
                    <p className="font-bold text-[#B8860B]">
                      {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(
                        viewingDelivery.delivery_items?.reduce((sum: number, item: any) =>
                          sum + ((item.quantity_delivered || 0) * (item.unit_price || 0)), 0
                        ) || 0
                      )}
                    </p>
                  </div>
                </div>

                {/* Client Info */}
                {viewingDelivery.client && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Informations Client
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Code:</span>
                        <span className="ml-2 font-medium">{viewingDelivery.client.code}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Nom:</span>
                        <span className="ml-2 font-medium">{viewingDelivery.client.name}</span>
                      </div>
                      {viewingDelivery.client.address && (
                        <div className="col-span-2">
                          <span className="text-gray-500">Adresse:</span>
                          <span className="ml-2">{viewingDelivery.client.address}</span>
                        </div>
                      )}
                      {viewingDelivery.client.city && (
                        <div>
                          <span className="text-gray-500">Ville:</span>
                          <span className="ml-2">{viewingDelivery.client.city}</span>
                        </div>
                      )}
                      {viewingDelivery.client.phone && (
                        <div>
                          <span className="text-gray-500">Tél:</span>
                          <span className="ml-2">{viewingDelivery.client.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Delivery Items */}
                {viewingDelivery.delivery_items && viewingDelivery.delivery_items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Articles ({viewingDelivery.delivery_items.length})
                      </h4>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Article</TableHead>
                          <TableHead className="text-right">Qté Cmd</TableHead>
                          <TableHead className="text-right">Qté Liv</TableHead>
                          <TableHead className="text-right">Prix Unit.</TableHead>
                          <TableHead className="text-right">Total HT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingDelivery.delivery_items.map((item: any) => {
                          const totalHT = (item.quantity_delivered || 0) * (item.unit_price || 0)
                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.article?.code || '-'}</TableCell>
                              <TableCell>{item.article?.name || '-'}</TableCell>
                              <TableCell className="text-right">{item.quantity_ordered || 0}</TableCell>
                              <TableCell className="text-right">{item.quantity_delivered || 0}</TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(item.unit_price || 0)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(totalHT)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        <TableRow className="bg-gray-50">
                          <TableCell colSpan={5} className="text-right font-semibold">Total HT:</TableCell>
                          <TableCell className="text-right font-bold text-[#B8860B]">
                            {new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(
                              viewingDelivery.delivery_items.reduce((sum: number, item: any) =>
                                sum + ((item.quantity_delivered || 0) * (item.unit_price || 0)), 0
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Notes */}
                {viewingDelivery.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">Notes</h4>
                    <p className="text-sm text-gray-700">{viewingDelivery.notes}</p>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsDeliveryDialogOpen(false)}>
                    Fermer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Aucune donnée disponible
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  )
}
