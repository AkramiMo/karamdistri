'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit, Trash2, Users, MapPin, Store, Utensils, ShoppingBag, Package, Eye, DollarSign, Upload, Image, X, Building2, FileText, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'

interface Client {
  id: string
  code: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  category: string | null
  gps_lat: number | null
  gps_lng: number | null
  logo_url: string | null
  local_image_url: string | null
  ice: string | null
  is_active: boolean
  created_at: string
}

const categoryLabels: Record<string, string> = {
  'FOD': 'Restaurant',
  'EPC': 'Epicerie',
  'DEP': 'Dépôt',
  'AUT': 'Autre',
  'MGZ': 'Magasin',
}

const categoryColors: Record<string, string> = {
  'FOD': 'bg-orange-100 text-orange-800',
  'EPC': 'bg-blue-100 text-blue-800',
  'DEP': 'bg-purple-100 text-purple-800',
  'AUT': 'bg-gray-100 text-gray-800',
  'MGZ': 'bg-green-100 text-green-800',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingClient, setViewingClient] = useState<Client | null>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    category: '',
    gps_lat: '',
    gps_lng: '',
    ice: '',
  })

  // Image upload states
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [localImageFile, setLocalImageFile] = useState<File | null>(null)
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [uploadStartTime, setUploadStartTime] = useState<number>(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('')

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'local') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image valide')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 5 Mo')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      if (type === 'logo') {
        setLogoFile(file)
        setLogoPreview(reader.result as string)
      } else {
        setLocalImageFile(file)
        setLocalImagePreview(reader.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  // Upload image via API route (bypasses RLS) with progress tracking
  const uploadImage = async (file: File, clientId: string, type: 'logo' | 'local'): Promise<string | null> => {
    return new Promise((resolve) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${clientId}/${type}-${Date.now()}.${fileExt}`
      const bucketName = 'client-images'

      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', bucketName)
      formData.append('path', fileName)

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(percentComplete)

          // Calculate estimated time remaining
          const elapsedTime = (Date.now() - uploadStartTime) / 1000 // seconds
          if (percentComplete > 0 && elapsedTime > 0) {
            const totalEstimatedTime = (elapsedTime / percentComplete) * 100
            const remainingTime = Math.max(0, totalEstimatedTime - elapsedTime)

            if (remainingTime < 60) {
              setEstimatedTimeRemaining(`${Math.ceil(remainingTime)}s restant`)
            } else {
              setEstimatedTimeRemaining(`${Math.ceil(remainingTime / 60)}min restant`)
            }
          }
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            if (response.success && response.publicUrl) {
              resolve(response.publicUrl)
            } else {
              console.error('Upload response error:', response.error)
              resolve(null)
            }
          } catch {
            console.error('Failed to parse upload response')
            resolve(null)
          }
        } else {
          console.error('Upload failed:', xhr.status, xhr.responseText)
          resolve(null)
        }
      })

      xhr.addEventListener('error', () => {
        console.error('Upload error')
        resolve(null)
      })

      // Use our API route instead of direct Supabase storage
      xhr.open('POST', '/api/storage/upload', true)
      xhr.send(formData)
    })
  }

  // Remove image
  const handleRemoveImage = (type: 'logo' | 'local') => {
    if (type === 'logo') {
      setLogoFile(null)
      setLogoPreview(null)
    } else {
      setLocalImageFile(null)
      setLocalImagePreview(null)
    }
  }

  const fetchClients = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching clients:', error)
    } else {
      setClients(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)
    setUploadProgress(0)
    setUploadStatus('')
    setEstimatedTimeRemaining('')
    setUploadStartTime(Date.now())

    try {
      const clientData: Record<string, unknown> = {
        code: formData.code,
        name: formData.name,
        contact_name: formData.contact_name || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        city: formData.city || null,
        category: formData.category || null,
        gps_lat: formData.gps_lat ? parseFloat(formData.gps_lat) : null,
        gps_lng: formData.gps_lng ? parseFloat(formData.gps_lng) : null,
        ice: formData.ice || null,
      }

      if (editingClient) {
        // Upload new images if selected
        if (logoFile) {
          setUploadStatus('Upload du logo...')
          setUploadStartTime(Date.now())
          const logoUrl = await uploadImage(logoFile, editingClient.id, 'logo')
          if (logoUrl) clientData.logo_url = logoUrl
        }
        if (localImageFile) {
          setUploadStatus('Upload de la photo du local...')
          setUploadStartTime(Date.now())
          setUploadProgress(0)
          const localUrl = await uploadImage(localImageFile, editingClient.id, 'local')
          if (localUrl) clientData.local_image_url = localUrl
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('clients') as any)
          .update(clientData)
          .eq('id', editingClient.id)

        if (!error) {
          fetchClients()
          setIsDialogOpen(false)
          resetForm()
        }
      } else {
        // Create client first to get ID
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newClient, error } = await (supabase.from('clients') as any)
          .insert([clientData])
          .select()
          .single()

        if (error) {
          console.error('Error creating client:', error)
          return
        }

        // Upload images with the new client ID
        let logoUrl = null
        let localUrl = null

        if (logoFile) {
          setUploadStatus('Upload du logo...')
          setUploadStartTime(Date.now())
          logoUrl = await uploadImage(logoFile, newClient.id, 'logo')
        }
        if (localImageFile) {
          setUploadStatus('Upload de la photo du local...')
          setUploadStartTime(Date.now())
          setUploadProgress(0)
          localUrl = await uploadImage(localImageFile, newClient.id, 'local')
        }

        // Update client with image URLs if uploaded
        if (logoUrl || localUrl) {
          const updateData: Record<string, string> = {}
          if (logoUrl) updateData.logo_url = logoUrl
          if (localUrl) updateData.local_image_url = localUrl

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('clients') as any)
            .update(updateData)
            .eq('id', newClient.id)
        }

        fetchClients()
        setIsDialogOpen(false)
        resetForm()
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      code: client.code,
      name: client.name,
      contact_name: client.contact_name || '',
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      city: client.city || '',
      category: client.category || '',
      gps_lat: client.gps_lat?.toString() || '',
      gps_lng: client.gps_lng?.toString() || '',
      ice: client.ice || '',
    })
    // Set existing images for preview
    setLogoPreview(client.logo_url || null)
    setLocalImagePreview(client.local_image_url || null)
    setLogoFile(null)
    setLocalImageFile(null)
    setIsDialogOpen(true)
  }

  const handleView = (client: Client) => {
    setViewingClient(client)
    setIsViewDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('clients') as any).delete().eq('id', id)
      if (!error) {
        fetchClients()
      }
    }
  }

  const resetForm = () => {
    setEditingClient(null)
    setFormData({
      code: '',
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      category: '',
      gps_lat: '',
      gps_lng: '',
      ice: '',
    })
    // Clear image states
    setLogoFile(null)
    setLogoPreview(null)
    setLocalImageFile(null)
    setLocalImagePreview(null)
  }

  const openGoogleMaps = (lat: number | null, lng: number | null) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
    }
  }

  const filteredClients = clients.filter((client) => {
    const search = searchTerm.toLowerCase().trim()

    // Enhanced search: name, code, city, contact, phone (partial match)
    const matchesSearch = !search ||
      client.name.toLowerCase().includes(search) ||
      client.code.toLowerCase().includes(search) ||
      client.city?.toLowerCase().includes(search) ||
      client.contact_name?.toLowerCase().includes(search) ||
      client.phone?.replace(/\s+/g, '').includes(search.replace(/\s+/g, '')) ||
      client.email?.toLowerCase().includes(search)

    const matchesCategory = categoryFilter === 'all' || client.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  // Stats by category
  const stats = {
    total: clients.length,
    FOD: clients.filter(c => c.category === 'FOD').length,
    EPC: clients.filter(c => c.category === 'EPC').length,
    DEP: clients.filter(c => c.category === 'DEP').length,
    MGZ: clients.filter(c => c.category === 'MGZ').length,
    AUT: clients.filter(c => c.category === 'AUT').length,
  }

  return (
    <ProtectedModule module="clients">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-500">Gérez vos clients ({clients.length} total)</p>
          </div>

          <div className="flex gap-2">
            <Link href="/clients/prix">
              <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                <DollarSign className="mr-2 h-4 w-4" />
                Prix par Client
              </Button>
            </Link>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <ProtectedModule module="clients" action="create">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      resetForm()
                      setIsDialogOpen(true)
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau client
                  </Button>
                </ProtectedModule>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingClient ? 'Modifier le client' : 'Nouveau client'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact</Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FOD">Restaurant (FOD)</SelectItem>
                        <SelectItem value="EPC">Epicerie (EPC)</SelectItem>
                        <SelectItem value="DEP">Dépôt (DEP)</SelectItem>
                        <SelectItem value="MGZ">Magasin (MGZ)</SelectItem>
                        <SelectItem value="AUT">Autre (AUT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ice">ICE (Identifiant Commun de l'Entreprise)</Label>
                    <Input
                      id="ice"
                      value={formData.ice}
                      onChange={(e) => setFormData({ ...formData, ice: e.target.value })}
                      placeholder="15 chiffres"
                      maxLength={15}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Coordonnées GPS
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gps_lat">Latitude</Label>
                      <Input
                        id="gps_lat"
                        type="number"
                        step="any"
                        value={formData.gps_lat}
                        onChange={(e) => setFormData({ ...formData, gps_lat: e.target.value })}
                        placeholder="ex: 34.016444"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gps_lng">Longitude</Label>
                      <Input
                        id="gps_lng"
                        type="number"
                        step="any"
                        value={formData.gps_lng}
                        onChange={(e) => setFormData({ ...formData, gps_lng: e.target.value })}
                        placeholder="ex: -5.03075"
                      />
                    </div>
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Images du client
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Logo Upload */}
                    <div className="space-y-2">
                      <Label>Logo du client</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        {logoPreview ? (
                          <div className="relative">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="w-full h-32 object-contain rounded"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-0 right-0 bg-red-100 hover:bg-red-200 text-red-600"
                              onClick={() => handleRemoveImage('logo')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer h-32">
                            <Building2 className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-500">Cliquer pour ajouter</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageChange(e, 'logo')}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Local Photo Upload */}
                    <div className="space-y-2">
                      <Label>Photo du local</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        {localImagePreview ? (
                          <div className="relative">
                            <img
                              src={localImagePreview}
                              alt="Local preview"
                              className="w-full h-32 object-contain rounded"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-0 right-0 bg-red-100 hover:bg-red-200 text-red-600"
                              onClick={() => handleRemoveImage('local')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center cursor-pointer h-32">
                            <Store className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-500">Cliquer pour ajouter</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleImageChange(e, 'local')}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Formats acceptés: JPG, PNG, GIF. Taille max: 5 Mo
                  </p>
                </div>

                {/* Upload Progress */}
                {isUploading && (logoFile || localImageFile) && (
                  <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="font-medium text-blue-700">{uploadStatus || 'Upload en cours...'}</span>
                      </div>
                      <span className="text-blue-600 font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                    {estimatedTimeRemaining && (
                      <p className="text-xs text-blue-600 text-right">{estimatedTimeRemaining}</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isUploading}>
                    Annuler
                  </Button>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : editingClient ? 'Modifier' : 'Créer'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Stats by category */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-green-600" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Restaurants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Utensils className="h-6 w-6 text-orange-600" />
                <span className="text-2xl font-bold">{stats.FOD}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Epiceries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-blue-600" />
                <span className="text-2xl font-bold">{stats.EPC}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Dépôts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-purple-600" />
                <span className="text-2xl font-bold">{stats.DEP}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Magasins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Store className="h-6 w-6 text-green-600" />
                <span className="text-2xl font-bold">{stats.MGZ}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Autres</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-gray-600">{stats.AUT}</span>
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
                  placeholder="Rechercher par nom, code, téléphone, ville..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  <SelectItem value="FOD">Restaurant (FOD)</SelectItem>
                  <SelectItem value="EPC">Epicerie (EPC)</SelectItem>
                  <SelectItem value="DEP">Dépôt (DEP)</SelectItem>
                  <SelectItem value="MGZ">Magasin (MGZ)</SelectItem>
                  <SelectItem value="AUT">Autre (AUT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Aucun client trouvé</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Ville</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>GPS</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.code}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{client.name}</div>
                            {client.address && (
                              <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                {client.address}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{client.contact_name || '-'}</TableCell>
                        <TableCell>{client.phone || '-'}</TableCell>
                        <TableCell>{client.city || '-'}</TableCell>
                        <TableCell>
                          {client.category ? (
                            <Badge className={categoryColors[client.category] || 'bg-gray-100'}>
                              {categoryLabels[client.category] || client.category}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {client.gps_lat && client.gps_lng ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                              onClick={() => openGoogleMaps(client.gps_lat, client.gps_lng)}
                            >
                              <MapPin className="h-4 w-4 mr-1" />
                              Voir
                            </Button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/clients/${client.id}`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Fiche client complète"
                              >
                                <FileText className="h-4 w-4 text-green-600" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleView(client)}
                              title="Aperçu rapide"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <ProtectedModule module="clients" action="edit">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(client)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </ProtectedModule>
                            <ProtectedModule module="clients" action="delete">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600"
                                onClick={() => handleDelete(client.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </ProtectedModule>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Client Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détails du client</DialogTitle>
            </DialogHeader>
            {viewingClient && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{viewingClient.name}</span>
                  {viewingClient.category && (
                    <Badge className={categoryColors[viewingClient.category] || 'bg-gray-100'}>
                      {categoryLabels[viewingClient.category] || viewingClient.category}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Code:</span>
                    <p className="font-medium">{viewingClient.code}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Contact:</span>
                    <p className="font-medium">{viewingClient.contact_name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Téléphone:</span>
                    <p className="font-medium">{viewingClient.phone || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium">{viewingClient.email || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Adresse:</span>
                    <p className="font-medium">{viewingClient.address || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Ville:</span>
                    <p className="font-medium">{viewingClient.city || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">ICE:</span>
                    <p className="font-medium">{viewingClient.ice || '-'}</p>
                  </div>
                </div>

                {/* Client Images - Always show this section */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Images du client
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-sm text-gray-500">Logo</span>
                      {viewingClient.logo_url ? (
                        <a
                          href={viewingClient.logo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                        >
                          <img
                            src={viewingClient.logo_url}
                            alt="Logo du client"
                            className="w-full h-48 object-contain bg-gray-50 hover:scale-105 transition-transform"
                          />
                        </a>
                      ) : (
                        <div className="border rounded-lg h-48 flex items-center justify-center bg-gray-50">
                          <div className="text-center text-gray-400">
                            <Building2 className="h-12 w-12 mx-auto mb-2" />
                            <span className="text-sm">Pas de logo</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-sm text-gray-500">Photo du local</span>
                      {viewingClient.local_image_url ? (
                        <a
                          href={viewingClient.local_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                        >
                          <img
                            src={viewingClient.local_image_url}
                            alt="Photo du local"
                            className="w-full h-48 object-contain bg-gray-50 hover:scale-105 transition-transform"
                          />
                        </a>
                      ) : (
                        <div className="border rounded-lg h-48 flex items-center justify-center bg-gray-50">
                          <div className="text-center text-gray-400">
                            <Store className="h-12 w-12 mx-auto mb-2" />
                            <span className="text-sm">Pas de photo</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {(viewingClient.logo_url || viewingClient.local_image_url) && (
                    <p className="text-xs text-gray-400 mt-2">Cliquez sur une image pour l&apos;agrandir</p>
                  )}
                </div>

                {viewingClient.gps_lat && viewingClient.gps_lng && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Localisation GPS
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Latitude:</span>
                        <p className="font-mono">{viewingClient.gps_lat}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Longitude:</span>
                        <p className="font-mono">{viewingClient.gps_lng}</p>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => openGoogleMaps(viewingClient.gps_lat, viewingClient.gps_lng)}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Ouvrir dans Google Maps
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedModule>
  )
}
