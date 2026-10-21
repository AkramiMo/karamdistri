'use client'

import { useEffect, useState } from 'react'
import { ProtectedModule } from '@/components/auth/ProtectedModule'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderOpen, Check, Info, FileText, FileSpreadsheet } from 'lucide-react'
import {
  isFileSystemAccessSupported as isPdfSupported,
  selectBLFolder,
  selectFactureFolder,
  getBLFolderName,
  getFactureFolderName,
  initFolderHandles as initPdfFolderHandles,
} from '@/lib/pdf/saveWithPicker'
import {
  isFileSystemAccessSupported as isExcelSupported,
  selectCommandesFolder,
  selectVentesFolder,
  getCommandesFolderName,
  getVentesFolderName,
  initExcelFolderHandles,
} from '@/lib/excel/saveWithPicker'

export default function ExportsPage() {
  const [isSupported, setIsSupported] = useState(false)
  const [blFolder, setBLFolder] = useState<string | null>(null)
  const [factureFolder, setFactureFolder] = useState<string | null>(null)
  const [commandesFolder, setCommandesFolder] = useState<string | null>(null)
  const [ventesFolder, setVentesFolder] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const supported = isPdfSupported() && isExcelSupported()
      setIsSupported(supported)

      if (supported) {
        await initPdfFolderHandles()
        await initExcelFolderHandles()
      }

      setBLFolder(getBLFolderName())
      setFactureFolder(getFactureFolderName())
      setCommandesFolder(getCommandesFolderName())
      setVentesFolder(getVentesFolderName())
      setIsLoading(false)
    }
    init()
  }, [])

  const handleSelectBL = async () => {
    const success = await selectBLFolder()
    if (success) {
      setBLFolder(getBLFolderName())
    }
  }

  const handleSelectFacture = async () => {
    const success = await selectFactureFolder()
    if (success) {
      setFactureFolder(getFactureFolderName())
    }
  }

  const handleSelectCommandes = async () => {
    const success = await selectCommandesFolder()
    if (success) {
      setCommandesFolder(getCommandesFolderName())
    }
  }

  const handleSelectVentes = async () => {
    const success = await selectVentesFolder()
    if (success) {
      setVentesFolder(getVentesFolderName())
    }
  }

  if (isLoading) {
    return (
      <ProtectedModule module="admin">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Chargement...</div>
        </div>
      </ProtectedModule>
    )
  }

  return (
    <ProtectedModule module="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration des Exports</h1>
          <p className="text-gray-500">Configurez les dossiers de sauvegarde automatique pour les PDF et Excel</p>
        </div>

        {!isSupported && (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800">Navigateur non compatible</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Votre navigateur ne supporte pas la sélection de dossiers pour la sauvegarde automatique.
                    Utilisez <strong>Chrome</strong> ou <strong>Edge</strong> pour bénéficier de cette fonctionnalité.
                  </p>
                  <p className="text-sm text-yellow-700 mt-2">
                    Les exports fonctionneront quand même, mais les fichiers seront téléchargés dans le dossier Téléchargements par défaut.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section PDF */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle>Exports PDF</CardTitle>
            </div>
            <CardDescription>
              Configuration des dossiers pour les Bons de Livraison et Factures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                <div>
                  <p className="font-medium text-gray-900">Bons de Livraison (BL)</p>
                  {blFolder ? (
                    <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" /> {blFolder}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Non configuré</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectBL}
                  disabled={!isSupported}
                  className="gap-1"
                >
                  <FolderOpen className="h-4 w-4" />
                  {blFolder ? 'Changer' : 'Sélectionner'}
                </Button>
              </div>

              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                <div>
                  <p className="font-medium text-gray-900">Factures</p>
                  {factureFolder ? (
                    <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" /> {factureFolder}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Non configuré</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectFacture}
                  disabled={!isSupported}
                  className="gap-1"
                >
                  <FolderOpen className="h-4 w-4" />
                  {factureFolder ? 'Changer' : 'Sélectionner'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section Excel */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <CardTitle>Exports Excel</CardTitle>
            </div>
            <CardDescription>
              Configuration des dossiers pour les exports Commandes et Ventes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                <div>
                  <p className="font-medium text-gray-900">Commandes</p>
                  {commandesFolder ? (
                    <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" /> {commandesFolder}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Non configuré</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectCommandes}
                  disabled={!isSupported}
                  className="gap-1"
                >
                  <FolderOpen className="h-4 w-4" />
                  {commandesFolder ? 'Changer' : 'Sélectionner'}
                </Button>
              </div>

              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
                <div>
                  <p className="font-medium text-gray-900">Ventes</p>
                  {ventesFolder ? (
                    <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3" /> {ventesFolder}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Non configuré</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectVentes}
                  disabled={!isSupported}
                  className="gap-1"
                >
                  <FolderOpen className="h-4 w-4" />
                  {ventesFolder ? 'Changer' : 'Sélectionner'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-gray-600" />
              <CardTitle>Comment fonctionne l'export automatique</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Export avec dossier configuré</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Le fichier est sauvegardé directement dans le dossier</li>
                  <li>Pas de dialogue de sauvegarde</li>
                  <li>Notification de succès affichée</li>
                  <li>Format: <code className="bg-gray-100 px-1 rounded">commandes_2026-09-25_14-30-45.xlsx</code></li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Export sans dossier configuré</h4>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Téléchargement standard du navigateur</li>
                  <li>Fichier dans le dossier Téléchargements</li>
                  <li>Fonctionne sur tous les navigateurs</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-blue-800">
                <strong>Navigateurs compatibles:</strong> Chrome, Edge, Opera (et autres navigateurs basés sur Chromium).
                Firefox et Safari ne supportent pas l'API File System Access et utiliseront le téléchargement standard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedModule>
  )
}
