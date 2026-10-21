'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FolderOpen, Check, X, Loader2 } from 'lucide-react'
import {
  isFileSystemAccessSupported,
  selectBLFolder,
  selectFactureFolder,
  getBLFolderName,
  getFactureFolderName,
  resetFolders,
  initFolderHandles,
  isBLFolderReady,
  isFactureFolderReady,
} from '@/lib/pdf/saveWithPicker'

interface FolderConfigProps {
  type: 'bl' | 'facture'
}

export function FolderConfig({ type }: FolderConfigProps) {
  const [folderName, setFolderName] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      setIsSupported(isFileSystemAccessSupported())

      // Initialiser les handles depuis IndexedDB
      await initFolderHandles()

      setFolderName(type === 'bl' ? getBLFolderName() : getFactureFolderName())
      setIsReady(type === 'bl' ? isBLFolderReady() : isFactureFolderReady())
      setIsLoading(false)
    }
    init()
  }, [type])

  const handleSelectFolder = async () => {
    setIsLoading(true)
    const success = type === 'bl' ? await selectBLFolder() : await selectFactureFolder()
    if (success) {
      setFolderName(type === 'bl' ? getBLFolderName() : getFactureFolderName())
      setIsReady(true)
    }
    setIsLoading(false)
  }

  const handleReset = async () => {
    await resetFolders()
    setFolderName(null)
    setIsReady(false)
  }

  if (!isSupported) {
    return (
      <div className="text-xs text-gray-500 flex items-center gap-1">
        <X className="h-3 w-3" />
        Sélection de dossier non supportée (utilisez Chrome ou Edge)
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Chargement...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {folderName && isReady ? (
        <>
          <div className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
            <Check className="h-4 w-4" />
            <span className="font-medium">{folderName}</span>
            <span className="text-green-500 text-xs">(actif)</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectFolder}
            className="text-xs"
          >
            Changer
          </Button>
        </>
      ) : folderName && !isReady ? (
        <>
          <div className="flex items-center gap-1 text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
            <FolderOpen className="h-4 w-4" />
            <span className="font-medium">{folderName}</span>
            <span className="text-orange-500 text-xs">(cliquer pour activer)</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectFolder}
            className="text-xs"
          >
            Activer
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectFolder}
          className="gap-1"
        >
          <FolderOpen className="h-4 w-4" />
          Configurer dossier {type === 'bl' ? 'BL' : 'Factures'}
        </Button>
      )}
    </div>
  )
}

export function FolderConfigPanel() {
  const [blFolder, setBLFolder] = useState<string | null>(null)
  const [factureFolder, setFactureFolder] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported(isFileSystemAccessSupported())
    setBLFolder(getBLFolderName())
    setFactureFolder(getFactureFolderName())
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

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          Votre navigateur ne supporte pas la sauvegarde automatique dans un dossier.
          Utilisez <strong>Chrome</strong> ou <strong>Edge</strong> pour cette fonctionnalité.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-blue-900">Configuration des dossiers de sauvegarde</h3>
      <p className="text-sm text-blue-700">
        Sélectionnez les dossiers où sauvegarder automatiquement les PDF
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between bg-white p-3 rounded border">
          <div>
            <p className="font-medium text-gray-900">Bons de Livraison</p>
            {blFolder ? (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> {blFolder}
              </p>
            ) : (
              <p className="text-sm text-gray-500">Non configuré</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectBL}
            className="gap-1"
          >
            <FolderOpen className="h-4 w-4" />
            {blFolder ? 'Changer' : 'Sélectionner'}
          </Button>
        </div>

        <div className="flex items-center justify-between bg-white p-3 rounded border">
          <div>
            <p className="font-medium text-gray-900">Factures</p>
            {factureFolder ? (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" /> {factureFolder}
              </p>
            ) : (
              <p className="text-sm text-gray-500">Non configuré</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectFacture}
            className="gap-1"
          >
            <FolderOpen className="h-4 w-4" />
            {factureFolder ? 'Changer' : 'Sélectionner'}
          </Button>
        </div>
      </div>

      <p className="text-xs text-blue-600">
        Une fois configurés, les PDF seront automatiquement sauvegardés dans ces dossiers.
      </p>
    </div>
  )
}
